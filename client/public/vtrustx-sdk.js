(function (window) {
    'use strict';

    const VTrustX = {
        config: null,
        iframe: null,
        container: null,
        baseUrl: 'https://rayixcx.web.app', // Default production URL - change as needed

        init: function (options) {
            this.config = Object.assign({
                slug: null,
                formId: null,
                mode: 'modal', // 'modal', 'inline', 'button'
                containerId: null, // For inline mode
                autoOpen: false,
                buttonText: 'Give Feedback',
                position: 'bottom-right', // 'bottom-right', 'bottom-left', 'center-right'
                themeColor: '#064e3b'
            }, options);

            if (options.baseUrl) this.baseUrl = options.baseUrl;

            if (this.config.mode === 'button' || this.config.mode === 'modal') {
                this.createLauncher();
            } else if (this.config.mode === 'inline') {
                this.embedInline();
            }

            if (this.config.autoOpen) {
                setTimeout(() => this.open(), 1000);
            }
        },

        getUrl: function () {
            const id = this.config.slug ? `slug/${this.config.slug}` : this.config.formId;
            // Determine viewing URL. Assuming /s/SLUG or /forms/ID handling in App
            // For now mapping to the Viewer route
            return `${this.baseUrl}/?mode=kiosk&slug=${this.config.slug || ''}&formId=${this.config.formId || ''}`;
        },

        createLauncher: function () {
            // Check if styles exist
            if (!document.getElementById('vtrustx-styles')) {
                const style = document.createElement('style');
                style.id = 'vtrustx-styles';
                style.innerHTML = `
                    .vtrustx-launcher {
                        position: fixed;
                        z-index: 999998;
                        padding: 12px 24px;
                        border-radius: 30px;
                        color: white;
                        font-family: sans-serif;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .vtrustx-launcher:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
                    .vtrustx-modal-overlay {
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.5);
                        z-index: 999999;
                        display: flex; align-items: center; justifyContent: center;
                        opacity: 0; visibility: hidden;
                        transition: opacity 0.3s;
                    }
                    .vtrustx-modal-overlay.open { opacity: 1; visibility: visible; }
                    .vtrustx-modal-content {
                        background: white;
                        width: 90%; max-width: 800px;
                        height: 80vh; max-height: 700px;
                        border-radius: 12px;
                        overflow: hidden;
                        position: relative;
                        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                    }
                    .vtrustx-close-btn {
                        position: absolute; top: 10px; right: 15px;
                        background: transparent; border: none;
                        font-size: 24px; cursor: pointer; color: #64748b; z-index: 10;
                    }
                `;
                document.head.appendChild(style);
            }

            const btn = document.createElement('div');
            btn.className = 'vtrustx-launcher';
            btn.innerText = this.config.buttonText;
            btn.style.backgroundColor = this.config.themeColor;

            // Positioning
            if (this.config.position === 'bottom-right') { btn.style.bottom = '20px'; btn.style.right = '20px'; }
            if (this.config.position === 'bottom-left') { btn.style.bottom = '20px'; btn.style.left = '20px'; }
            if (this.config.position === 'center-right') {
                btn.style.top = '50%'; btn.style.right = '-40px';
                btn.style.transform = 'translateY(-50%) rotate(-90deg)';
                btn.style.transformOrigin = 'center';
            }

            btn.onclick = () => this.open();
            document.body.appendChild(btn);
        },

        open: function () {
            if (this.iframe) {
                document.getElementById('vtrustx-overlay').classList.add('open');
                return;
            }

            const overlay = document.createElement('div');
            overlay.id = 'vtrustx-overlay';
            overlay.className = 'vtrustx-modal-overlay open';

            const content = document.createElement('div');
            content.className = 'vtrustx-modal-content';

            const close = document.createElement('button');
            close.className = 'vtrustx-close-btn';
            close.innerHTML = '&times;';
            close.onclick = () => this.close();

            const frame = document.createElement('iframe');
            frame.src = this.getUrl();
            frame.style.width = '100%';
            frame.style.height = '100%';
            frame.style.border = 'none';

            content.appendChild(close);
            content.appendChild(frame);
            overlay.appendChild(content);

            // Close on click outside
            overlay.onclick = (e) => {
                if (e.target === overlay) this.close();
            };

            document.body.appendChild(overlay);
            this.iframe = frame;
        },

        close: function () {
            const overlay = document.getElementById('vtrustx-overlay');
            if (overlay) overlay.classList.remove('open');
        },

        embedInline: function () {
            const container = document.getElementById(this.config.containerId);
            if (!container) return console.error('VTrustX: Container not found');

            const frame = document.createElement('iframe');
            frame.src = this.getUrl();
            frame.style.width = '100%';
            frame.style.height = '100%';
            frame.style.minHeight = '600px';
            frame.style.border = 'none';

            container.innerHTML = '';
            container.appendChild(frame);
        }
    };

    window.VTrustX = VTrustX;

})(window);
