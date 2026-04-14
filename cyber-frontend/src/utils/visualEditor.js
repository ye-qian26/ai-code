/**
 * 可视化编辑器工具类
 * 负责管理 iframe 内的可视化编辑功能
 */
export class VisualEditor {
  constructor(options = {}) {
    this.iframe = null
    this.isEditMode = false
    this.options = options
    this.selectedElement = null
    this.elementInfoHistory = []
    this.currentText = ''
  }

  init(iframe) {
    this.iframe = iframe
  }

  enableEditMode() {
    if (!this.iframe) return
    this.isEditMode = true
    setTimeout(() => this.injectEditScript(), 300)
  }

  disableEditMode() {
    this.isEditMode = false
    this.sendMessageToIframe({ type: 'TOGGLE_EDIT_MODE', editMode: false })
    this.sendMessageToIframe({ type: 'CLEAR_ALL_EFFECTS' })
  }

  toggleEditMode() {
    if (this.isEditMode) {
      this.disableEditMode()
      return false
    } else {
      this.enableEditMode()
      return true
    }
  }

  syncState() {
    if (!this.isEditMode) {
      this.sendMessageToIframe({ type: 'CLEAR_ALL_EFFECTS' })
    }
  }

  clearSelection() {
    this.selectedElement = null
    this.currentText = ''
    this.sendMessageToIframe({ type: 'CLEAR_SELECTION' })
    if (this.options.onElementCleared) {
      this.options.onElementCleared()
    }
  }

  onIframeLoad() {
    if (this.isEditMode) {
      setTimeout(() => this.injectEditScript(), 500)
    } else {
      setTimeout(() => this.syncState(), 500)
    }
  }

  handleIframeMessage(event) {
    const { type, data } = event.data
    switch (type) {
      case 'ELEMENT_SELECTED':
        if (data?.elementInfo) {
          this.selectedElement = data.elementInfo
          this.elementInfoHistory.push(data.elementInfo)
          if (this.options.onElementSelected) {
            this.options.onElementSelected(data.elementInfo)
          }
        }
        break
      case 'ELEMENT_HOVER':
        if (data?.elementInfo && this.options.onElementHover) {
          this.options.onElementHover(data.elementInfo)
        }
        break
      case 'ELEMENT_TEXT_CHANGE':
        if (data?.text !== undefined) {
          this.currentText = data.text
          if (this.options.onTextChange) {
            this.options.onTextChange(data.text)
          }
        }
        break
    }
  }

  sendMessageToIframe(message) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*')
    }
  }

  sendElementTextUpdate(text) {
    this.sendMessageToIframe({ type: 'UPDATE_ELEMENT_TEXT', text })
  }

  injectEditScript() {
    if (!this.iframe) return

    const waitForIframeLoad = () => {
      try {
        if (this.iframe.contentWindow && this.iframe.contentDocument) {
          if (this.iframe.contentDocument.getElementById('visual-edit-script')) {
            this.sendMessageToIframe({ type: 'TOGGLE_EDIT_MODE', editMode: true })
            return
          }

          const script = this.generateEditScript()
          const scriptElement = this.iframe.contentDocument.createElement('script')
          scriptElement.id = 'visual-edit-script'
          scriptElement.textContent = script
          this.iframe.contentDocument.head.appendChild(scriptElement)
        } else {
          setTimeout(waitForIframeLoad, 100)
        }
      } catch {
        // 跨域限制，静默处理
      }
    }

    waitForIframeLoad()
  }

  generateEditScript() {
    return `
      (function() {
        var isEditMode = true;
        var currentHoverElement = null;
        var currentSelectedElement = null;

        function injectStyles() {
          if (document.getElementById('edit-mode-styles')) return;
          var style = document.createElement('style');
          style.id = 'edit-mode-styles';
          style.textContent = '\\\
            .edit-hover {\\\
              outline: 2px dashed #1890ff !important;\\\
              outline-offset: 2px !important;\\\
              cursor: crosshair !important;\\\
              transition: outline 0.2s ease !important;\\\
            }\\\
            .edit-selected {\\\
              outline: 3px solid #52c41a !important;\\\
              outline-offset: 2px !important;\\\
              cursor: default !important;\\\
              box-shadow: 0 0 0 1px rgba(82,196,26,0.15) !important;\\\
            }\\\
            #edit-tip {\\\
              position: fixed;\\\
              top: 20px;\\\
              right: 20px;\\\
              background: #1890ff;\\\
              color: white;\\\
              padding: 12px 16px;\\\
              border-radius: 6px;\\\
              font-size: 14px;\\\
              z-index: 99999;\\\
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);\\\
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;\\\
              pointer-events: auto;\\\
              max-width: 300px;\\\
            }\\\
            #edit-tip .tip-close {\\\
              position: absolute;\\\
              top: 4px;\\\
              right: 8px;\\\
              cursor: pointer;\\\
              font-size: 18px;\\\
              opacity: 0.7;\\\
            }\\\
            #edit-tip .tip-close:hover { opacity: 1; }\\\
          ';
          document.head.appendChild(style);
        }

        function generateSelector(element) {
          var path = [];
          var current = element;
          while (current && current !== document.body) {
            var selector = current.tagName.toLowerCase();
            if (current.id) {
              selector += '#' + current.id;
              path.unshift(selector);
              break;
            }
            if (current.className && typeof current.className === 'string') {
              var classes = current.className.split(' ').filter(function(c) {
                return c && c.indexOf('edit-') !== 0;
              });
              if (classes.length > 0) {
                selector += '.' + classes.join('.');
              }
            }
            var parent = current.parentElement;
            if (parent) {
              var siblings = Array.prototype.slice.call(parent.children);
              var index = siblings.indexOf(current) + 1;
              selector += ':nth-child(' + index + ')';
            }
            path.unshift(selector);
            current = current.parentElement;
          }
          return path.join(' > ');
        }

        function getElementInfo(element) {
          var rect = element.getBoundingClientRect();
          var pagePath = window.location.search + window.location.hash;

          var textContent = '';
          if (element.childNodes.length > 0) {
            var textNodes = Array.prototype.filter.call(element.childNodes, function(node) {
              return node.nodeType === Node.TEXT_NODE;
            });
            textContent = textNodes.map(function(n) { return n.textContent.trim(); }).join(' ').trim();
          } else {
            textContent = (element.textContent || '').trim();
          }

          return {
            tagName: element.tagName,
            id: element.id || '',
            className: (typeof element.className === 'string' ? element.className : '') || '',
            textContent: textContent.substring(0, 200),
            selector: generateSelector(element),
            pagePath: pagePath || '',
            rect: {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            attributes: getElementAttributes(element)
          };
        }

        function getElementAttributes(element) {
          var attrs = {};
          if (element.attributes) {
            for (var i = 0; i < element.attributes.length; i++) {
              var attr = element.attributes[i];
              if (attr.name.indexOf('data-') === 0 || ['id', 'class', 'src', 'href', 'alt', 'title'].indexOf(attr.name) !== -1) {
                attrs[attr.name] = attr.value;
              }
            }
          }
          return attrs;
        }

        function clearHoverEffect() {
          if (currentHoverElement) {
            currentHoverElement.classList.remove('edit-hover');
            currentHoverElement = null;
          }
        }

        function clearSelectedEffect() {
          var selected = document.querySelectorAll('.edit-selected');
          for (var i = 0; i < selected.length; i++) {
            selected[i].classList.remove('edit-selected');
          }
          currentSelectedElement = null;
        }

        var eventListenersAdded = false;

        function addEventListeners() {
          if (eventListenersAdded) return;

          document.body.addEventListener('mouseover', function(event) {
            if (!isEditMode) return;
            var target = event.target;
            if (target === currentHoverElement || target === currentSelectedElement) return;
            if (target === document.body || target === document.documentElement) return;
            if (target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return;
            clearHoverEffect();
            target.classList.add('edit-hover');
            currentHoverElement = target;

            try {
              window.parent.postMessage({ type: 'ELEMENT_HOVER', data: { elementInfo: getElementInfo(target) } }, '*');
            } catch(e) {}
          }, true);

          document.body.addEventListener('mouseout', function(event) {
            if (!isEditMode) return;
            var target = event.target;
            if (!event.relatedTarget || !target.contains(event.relatedTarget)) {
              clearHoverEffect();
            }
          }, true);

          document.body.addEventListener('click', function(event) {
            if (!isEditMode) return;
            event.preventDefault();
            event.stopPropagation();

            var target = event.target;
            if (target === document.body || target === document.documentElement) return;
            if (target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return;

            clearSelectedEffect();
            clearHoverEffect();

            target.classList.add('edit-selected');
            currentSelectedElement = target;

            var elementInfo = getElementInfo(target);
            try {
              window.parent.postMessage({ type: 'ELEMENT_SELECTED', data: { elementInfo: elementInfo } }, '*');
            } catch(e) {}
          }, true);

          eventListenersAdded = true;
        }

        function showEditTip() {
          if (document.getElementById('edit-tip')) return;
          var tip = document.createElement('div');
          tip.id = 'edit-tip';
          tip.innerHTML = '<span class="tip-close" onclick="this.parentElement.remove()">×</span>\\n               <strong>编辑模式</strong><br/>悬浮查看元素，点击选中';
          document.body.appendChild(tip);
          setTimeout(function() {
            if (tip.parentNode) {
              tip.style.opacity = '0';
              tip.style.transition = 'opacity 0.3s';
              setTimeout(function() { tip.remove(); }, 300);
            }
          }, 3000);
        }

        function setupEventListeners() {
          addEventListeners();
        }

        window.addEventListener('message', function(event) {
          var type = event.data.type;
          var editMode = event.data.editMode;
          switch (type) {
            case 'TOGGLE_EDIT_MODE':
              isEditMode = editMode;
              if (isEditMode) {
                injectStyles();
                setupEventListeners();
                showEditTip();
              } else {
                clearHoverEffect();
                clearSelectedEffect();
              }
              break;
            case 'CLEAR_SELECTION':
              clearSelectedEffect();
              break;
            case 'CLEAR_ALL_EFFECTS':
              isEditMode = false;
              clearHoverEffect();
              clearSelectedEffect();
              var tip = document.getElementById('edit-tip');
              if (tip) tip.remove();
              break;
            case 'UPDATE_ELEMENT_TEXT':
              if (currentSelectedElement) {
                var text = event.data.text || '';
                if (currentSelectedElement.tagName === 'INPUT' || currentSelectedElement.tagName === 'TEXTAREA') {
                  currentSelectedElement.value = text;
                } else {
                  currentSelectedElement.textContent = text;
                }
              }
              break;
          }
        });

        injectStyles();
        setupEventListeners();
        showEditTip();
      })();
    `
  }
}
