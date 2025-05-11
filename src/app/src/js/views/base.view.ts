export abstract class BaseView {
  protected element: HTMLElement;
  protected template: string = '';

  constructor(viewName: string) {
    this.element = document.createElement('div');
    this.element.id = `view-${viewName}`;
    this.element.className = 'view';
    document.getElementById('app-content')?.appendChild(this.element);
  }

  show(): void {
    this.element.style.display = 'block';
    this.onShow();
  }

  hide(): void {
    this.element.style.display = 'none';
    this.onHide();
  }

  protected abstract render(): void;
  protected onShow(): void {}
  protected onHide(): void {}

  protected setContent(html: string): void {
    this.element.innerHTML = html;
  }
} 