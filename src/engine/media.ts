import type { MediaSource } from './api';

/**
 * A video file the player chose from their own device. It is played from a local
 * object URL: nothing is uploaded, and nothing is kept after the page closes.
 */
export class VideoMedia implements MediaSource {
  readonly kind = 'media' as const;
  readonly id: string;
  readonly video: HTMLVideoElement;
  private url: string;

  constructor(file: Blob, id = 'video') {
    this.id = id;
    this.url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.src = this.url;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    this.video = v;
  }

  get aspect(): number {
    const v = this.video;
    return v.videoWidth > 0 && v.videoHeight > 0 ? v.videoWidth / v.videoHeight : 0;
  }

  ready(): boolean {
    return this.video.readyState >= 2;
  }

  play(): void {
    void this.video.play().catch(() => {});
  }

  pause(): void {
    this.video.pause();
  }

  dispose(): void {
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    URL.revokeObjectURL(this.url);
  }
}
