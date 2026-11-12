import { describe, expect, it } from 'vitest';
import { testGameContext } from '../../engine/api';
import { GlowBounce } from './game';
import { COLS, MAX_SPEED, MIN_SPEED, afterClearedWall, afterLostBall, layout, paddleBounce } from './logic';

describe('Glow Bounce rules', () => {
  it('gets easier after a lost ball and harder after a cleared wall, within limits', () => {
    const t = { speed: 1, width: 1 };
    expect(afterLostBall(t).speed).toBeLessThan(1);
    expect(afterLostBall(t).width).toBeGreaterThan(1);
    expect(afterClearedWall(t).speed).toBeGreaterThan(1);
    let x = t;
    for (let i = 0; i < 50; i++) x = afterLostBall(x);
    expect(x.speed).toBe(MIN_SPEED);
    for (let i = 0; i < 50; i++) x = afterClearedWall(x);
    expect(x.speed).toBe(MAX_SPEED);
  });

  it('every wall has bricks in every layout', () => {
    for (let wall = 0; wall < 8; wall++) {
      const grid = layout(wall);
      expect(grid[0].length).toBe(COLS);
      expect(grid.flat().filter(Boolean).length).toBeGreaterThan(10);
    }
  });

  it('the paddle always sends the ball up, at the same speed', () => {
    for (const off of [-1.5, -1, 0, 0.5, 1]) {
      const v = paddleBounce(off, 300);
      expect(v.vy).toBeLessThan(0);
      expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(300);
    }
  });

  it('a round ends after three lost balls and the tuning is saved', () => {
    const g = new GlowBounce(testGameContext());
    g.resize(400, 600);
    const inner = g as unknown as { ball: { x: number; y: number; vx: number; vy: number; stuck: boolean } };
    for (let lost = 0; lost < 3; lost++) {
      g.input({ kind: 'action', action: 'primary', pressed: true });
      // Send the ball straight down past the paddle.
      inner.ball = { x: 5000, y: 590, vx: 0, vy: 400, stuck: false };
      for (let i = 0; i < 30; i++) g.update(1000 / 60);
    }
    expect(g.status().over).toBe(true);
    expect(g.save().speed).toBeLessThan(1);
  });
});
