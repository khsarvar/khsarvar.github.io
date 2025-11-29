// Window Manager
class WindowManager {
    constructor() {
        this.windows = {};
        this.activeWindow = null;
        this.maxZIndex = 200;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.currentDraggedWindow = null;
        this.resizing = false;
        this.resizeTarget = null;
        this.resizeDirection = null;
        this.resizeStart = null;
        this.menuBarHeight = 30;
        this.desktopElement = null;
        this.viewportPadding = 12;
        
        this.init();
    }

    init() {
        this.desktopElement = document.getElementById('desktop');
        const menuBar = document.querySelector('.menu-bar');
        if (menuBar) {
            this.menuBarHeight = menuBar.offsetHeight;
        }

        // Initialize all windows
        const windowElements = document.querySelectorAll('.window');
        windowElements.forEach(window => {
            const appName = window.dataset.app;
            this.windows[appName] = {
                element: window,
                state: 'closed', // closed, open, minimized, maximized
                originalPosition: { x: 0, y: 0 },
                originalSize: { width: 0, height: 0 }
            };
        });

        // Set up window controls
        this.setupWindowControls();
        
        // Set up drag functionality
        this.setupDrag();

        // Ensure windows remain visible across viewport sizes
        this.setupViewportHandling();
        
        // Set up dock interactions
        this.setupDock();
        
        // Set up desktop icons
        this.setupDesktopIcons();
        
        // Set up resize handles
        this.setupResizeHandles();
        
        // Initialize clock
        this.initClock();
        
        // Open About Me window by default
        this.openWindow('about');
    }

    setupWindowControls() {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const window = btn.closest('.window');
                const appName = window.dataset.app;
                
                switch(action) {
                    case 'close':
                        this.closeWindow(appName);
                        break;
                    case 'minimize':
                        this.minimizeWindow(appName);
                        break;
                    case 'maximize':
                        this.maximizeWindow(appName);
                        break;
                }
            });
        });
    }

    setupDrag() {
        document.querySelectorAll('.window-titlebar').forEach(titlebar => {
            titlebar.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('control-btn')) {
                    return;
                }
                
                e.preventDefault(); // Prevent text selection
                
                const window = titlebar.closest('.window');
                const appName = window.dataset.app;
                
                // Bring window to front
                this.bringToFront(appName);
                
                // Start dragging
                this.dragging = true;
                this.currentDraggedWindow = appName;
                
                const rect = window.getBoundingClientRect();
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
                
                // Store original position if not maximized
                if (!window.classList.contains('maximized')) {
                    this.windows[appName].originalPosition = {
                        x: rect.left,
                        y: rect.top
                    };
                }
                
                // Add dragging class for cursor styling
                document.body.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (this.resizing && this.resizeTarget) {
                this.handleResize(e);
                return;
            }

            if (this.dragging && this.currentDraggedWindow) {
                const windowElement = this.windows[this.currentDraggedWindow].element;
                
                if (windowElement.classList.contains('maximized')) {
                    // If maximized, restore first
                    this.maximizeWindow(this.currentDraggedWindow);
                    // Adjust position based on drag offset
                    const rect = windowElement.getBoundingClientRect();
                    this.dragOffset.x = e.clientX - rect.width / 2;
                    this.dragOffset.y = e.clientY - 50;
                }
                
                const newX = e.clientX - this.dragOffset.x;
                const newY = e.clientY - this.dragOffset.y;
                
                // Constrain to viewport
                const viewportWidth = document.documentElement.clientWidth;
                const viewportHeight = document.documentElement.clientHeight;
                const windowWidth = windowElement.offsetWidth;
                const windowHeight = windowElement.offsetHeight;
                const menuBarHeight = this.menuBarHeight;
                
                const maxX = viewportWidth - windowWidth;
                const maxY = viewportHeight - windowHeight;
                
                windowElement.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
                windowElement.style.top = Math.max(menuBarHeight, Math.min(newY, maxY)) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.dragging) {
                this.dragging = false;
                this.currentDraggedWindow = null;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }

            if (this.resizing) {
                this.resizing = false;
                this.resizeTarget = null;
                this.resizeDirection = null;
                this.resizeStart = null;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    setupDock() {
        document.querySelectorAll('.dock-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                const appName = icon.dataset.app;
                this.toggleWindow(appName);
            });
        });
    }

    setupDesktopIcons() {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                const appName = icon.dataset.app;
                const folderName = icon.dataset.folder;
                
                if (appName) {
                    this.openWindow(appName);
                } else if (folderName) {
                    // Handle folder clicks (can be extended later)
                    console.log(`Folder clicked: ${folderName}`);
                }
            });
        });
    }

    setupResizeHandles() {
        const directions = ['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
        
        Object.values(this.windows).forEach(({ element }) => {
            directions.forEach(direction => {
                const handle = document.createElement('div');
                handle.classList.add('resize-handle', `handle-${direction}`);
                handle.dataset.direction = direction;
                element.appendChild(handle);

                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (element.classList.contains('maximized')) {
                        return;
                    }

                    const appName = element.dataset.app;
                    this.bringToFront(appName);
                    
                    this.resizing = true;
                    this.resizeTarget = appName;
                    this.resizeDirection = direction;
                    
                    const rect = element.getBoundingClientRect();
                    this.resizeStart = {
                        x: e.clientX,
                        y: e.clientY,
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        top: rect.top
                    };

                    document.body.style.cursor = this.getCursorForDirection(direction);
                    document.body.style.userSelect = 'none';
                });
            });
        });
    }

    getCursorForDirection(direction) {
        if (direction.includes('left') && direction.includes('top')) return 'nwse-resize';
        if (direction.includes('right') && direction.includes('bottom')) return 'nwse-resize';
        if (direction.includes('right') && direction.includes('top')) return 'nesw-resize';
        if (direction.includes('left') && direction.includes('bottom')) return 'nesw-resize';
        if (direction === 'left' || direction === 'right') return 'ew-resize';
        if (direction === 'top' || direction === 'bottom') return 'ns-resize';
        return 'default';
    }

    handleResize(e) {
        const windowData = this.windows[this.resizeTarget];
        if (!windowData) return;

        const windowElement = windowData.element;
        const direction = this.resizeDirection;
        const start = this.resizeStart;

        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;

        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const { width: minWidth, height: minHeight } = this.getMinDimensions();

        let newWidth = start.width;
        let newHeight = start.height;
        let newLeft = start.left;
        let newTop = start.top;

        if (direction.includes('right')) {
            newWidth = start.width + dx;
        }
        if (direction.includes('left')) {
            newWidth = start.width - dx;
            newLeft = start.left + dx;
        }
        if (direction.includes('bottom')) {
            newHeight = start.height + dy;
        }
        if (direction.includes('top')) {
            newHeight = start.height - dy;
            newTop = start.top + dy;
        }

        newWidth = Math.max(minWidth, newWidth);
        newHeight = Math.max(minHeight, newHeight);

        if (newLeft < 0) {
            newWidth += newLeft;
            newLeft = 0;
        }
        if (newTop < this.menuBarHeight) {
            newHeight += newTop - this.menuBarHeight;
            newTop = this.menuBarHeight;
        }

        if (newLeft + newWidth > viewportWidth) {
            newWidth = viewportWidth - newLeft;
        }
        if (newTop + newHeight > viewportHeight) {
            newHeight = viewportHeight - newTop;
        }

        windowElement.style.width = `${newWidth}px`;
        windowElement.style.height = `${newHeight}px`;
        windowElement.style.left = `${newLeft}px`;
        windowElement.style.top = `${newTop}px`;
    }

    openWindow(appName) {
        const windowData = this.windows[appName];
        if (!windowData) return;

        const window = windowData.element;
        
        // If minimized, restore position
        if (windowData.state === 'minimized') {
            window.classList.remove('minimized');
            windowData.state = 'open';
        }
        
        // If closed, show window
        if (windowData.state === 'closed') {
            window.classList.add('active');
            windowData.state = 'open';
        }
        
        // Bring to front
        this.bringToFront(appName);

        // Ensure window fits within current viewport
        this.ensureWindowInViewport(window);
        
        // Update dock icon
        this.updateDockIcon(appName, true);
    }

    closeWindow(appName) {
        const windowData = this.windows[appName];
        if (!windowData) return;

        const window = windowData.element;
        window.classList.remove('active', 'maximized', 'minimized');
        windowData.state = 'closed';
        
        // Update dock icon
        this.updateDockIcon(appName, false);
    }

    minimizeWindow(appName) {
        const windowData = this.windows[appName];
        if (!windowData) return;

        const window = windowData.element;
        window.classList.add('minimized');
        window.classList.remove('active', 'maximized');
        windowData.state = 'minimized';
        
        // Update dock icon (keep active state for minimized)
        this.updateDockIcon(appName, true);
    }

    maximizeWindow(appName) {
        const windowData = this.windows[appName];
        if (!windowData) return;

        const window = windowData.element;
        
        if (window.classList.contains('maximized')) {
            // Restore
            window.classList.remove('maximized');
            const originalPos = windowData.originalPosition;
            const originalSize = windowData.originalSize;
            
            if (originalPos.x && originalPos.y) {
                window.style.left = originalPos.x + 'px';
                window.style.top = originalPos.y + 'px';
            }
            if (originalSize.width && originalSize.height) {
                window.style.width = originalSize.width + 'px';
                window.style.height = originalSize.height + 'px';
            }

            this.ensureWindowInViewport(window);
        } else {
            // Maximize
            const rect = window.getBoundingClientRect();
            windowData.originalPosition = { x: rect.left, y: rect.top };
            windowData.originalSize = { width: rect.width, height: rect.height };
            
            window.classList.add('maximized');
        }
    }

    toggleWindow(appName) {
        const windowData = this.windows[appName];
        if (!windowData) return;

        switch(windowData.state) {
            case 'closed':
                this.openWindow(appName);
                break;
            case 'minimized':
                this.openWindow(appName);
                break;
            case 'open':
            case 'maximized':
                this.bringToFront(appName);
                break;
        }
    }

    bringToFront(appName) {
        const windowData = this.windows[appName];
        if (!windowData) return;

        const window = windowData.element;
        this.maxZIndex += 1;
        window.style.zIndex = this.maxZIndex;
        this.activeWindow = appName;
        
        // Update active states
        document.querySelectorAll('.window').forEach(w => {
            w.classList.remove('active');
        });
        window.classList.add('active');
    }

    updateDockIcon(appName, isActive) {
        const dockIcon = document.querySelector(`.dock-icon[data-app="${appName}"]`);
        if (dockIcon) {
            if (isActive) {
                dockIcon.classList.add('active');
            } else {
                dockIcon.classList.remove('active');
            }
        }
    }

    setupViewportHandling() {
        const onResize = () => this.ensureAllWindowsInViewport();
        window.addEventListener('resize', onResize);
        this.ensureAllWindowsInViewport();
    }

    ensureAllWindowsInViewport() {
        Object.values(this.windows).forEach(({ element }) => {
            this.ensureWindowInViewport(element);
        });
    }

    ensureWindowInViewport(windowElement) {
        if (
            !windowElement ||
            windowElement.classList.contains('maximized') ||
            getComputedStyle(windowElement).display === 'none'
        ) {
            return;
        }

        const padding = this.viewportPadding;
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const maxWidth = viewportWidth - padding * 2;
        const maxHeight = viewportHeight - this.menuBarHeight - padding * 2;

        if (maxWidth > 0) {
            const currentWidth = windowElement.getBoundingClientRect().width;
            const adjustedWidth = Math.min(currentWidth, maxWidth);
            windowElement.style.width = `${adjustedWidth}px`;
        }

        if (maxHeight > 0) {
            const currentHeight = windowElement.getBoundingClientRect().height;
            const adjustedHeight = Math.min(currentHeight, maxHeight);
            windowElement.style.height = `${adjustedHeight}px`;
        }

        const updatedRect = windowElement.getBoundingClientRect();
        const desktopRect = this.desktopElement
            ? this.desktopElement.getBoundingClientRect()
            : { left: 0, top: 0 };

        const relativeLeft = updatedRect.left - desktopRect.left;
        const relativeTop = updatedRect.top - desktopRect.top;
        const maxLeft = viewportWidth - updatedRect.width - padding;
        const maxTop = viewportHeight - updatedRect.height - padding;

        const newLeft = this.clamp(relativeLeft, padding, Math.max(padding, maxLeft));
        const newTop = this.clamp(
            relativeTop,
            this.menuBarHeight + padding,
            Math.max(this.menuBarHeight + padding, maxTop)
        );

        windowElement.style.left = `${newLeft}px`;
        windowElement.style.top = `${newTop}px`;
    }

    getMinDimensions() {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const horizontalSpace = Math.max(0, viewportWidth - this.viewportPadding * 2);
        const verticalSpace = Math.max(
            0,
            viewportHeight - this.menuBarHeight - this.viewportPadding * 2
        );

        const minWidth =
            horizontalSpace <= 240 ? horizontalSpace : Math.min(400, horizontalSpace);
        const minHeight =
            verticalSpace <= 220 ? verticalSpace : Math.min(300, verticalSpace);

        return {
            width: minWidth,
            height: minHeight
        };
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    initClock() {
        const updateClock = () => {
            const clockElement = document.getElementById('clock');
            if (clockElement) {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                clockElement.textContent = `${hours}:${minutes}`;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WindowManager();
});
