"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseView = void 0;
class BaseView {
    constructor(viewName) {
        this.template = '';
        this.element = document.createElement('div');
        this.element.id = `view-${viewName}`;
        this.element.className = 'view';
        document.getElementById('app-content')?.appendChild(this.element);
    }
    show() {
        this.element.style.display = 'block';
        this.onShow();
    }
    hide() {
        this.element.style.display = 'none';
        this.onHide();
    }
    onShow() { }
    onHide() { }
    setContent(html) {
        this.element.innerHTML = html;
    }
}
exports.BaseView = BaseView;
