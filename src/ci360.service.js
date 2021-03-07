import {
  addClass,
  contain,
  get360ViewProps,
  getResponsiveWidthOfContainer,
  getSizeAccordingToPixelRatio,
  magnify,
  pad,
  removeClass,
  set360ViewCircleIconStyles,
  set360ViewIconStyles,
  setBoxShadowStyles,
  setCloseFullScreenViewStyles,
  setFullScreenIconStyles,
  setFullScreenModalStyles,
  setLoaderStyles,
  setMagnifyIconStyles,
  setView360Icon
} from './ci360.utils';


class CI360Viewer {
  constructor(container, fullScreen, ratio) {
    this.container = container;
    this.activeRow = 1;
    this.activeCol = 1;
    this.movementStartX = 0;
    this.movementStartY = 0;
    this.isClicked = false;
    this.loadedImages = 0;
    this.imagesLoaded = false;
    this.reversed = false;
    this.fullScreenView = !!fullScreen;
    this.ratio = ratio;
    this.images = [];
    this.devicePixelRatio = Math.round(window.devicePixelRatio || 1);
    this.isMobile = !!('ontouchstart' in window || navigator.msMaxTouchPoints);
    this.id = container.id;
    this.init(container);
  }

  mousedown(event) {
    event.preventDefault();

    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }

    if (this.view360Icon) {
      this.remove360ViewIcon();
    }

    if (this.autoplay || this.loopTimeoutId) {
      this.stop();
      this.autoplay = false;
    }

    this.movementStartX = event.pageX;
    this.movementStartY = event.pageY;
    this.isClicked = true;
    this.container.style.cursor = 'grabbing';
  }

  mouseup() {
    if (!this.imagesLoaded) return;

    this.movementStartX = 0;
    this.movementStartY = 0;
    this.isClicked = false;
    this.container.style.cursor = 'grab';

    if (this.bottomCircle) {
      this.show360ViewCircleIcon();
    }
  }

  mousemove(event) {
    if (!this.isClicked || !this.imagesLoaded) return;

    this.onMove(event.pageX, event.pageY);
  }

  touchstart(event) {
    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }

    if (this.view360Icon) {
      this.remove360ViewIcon();
    }

    if (this.autoplay || this.loopTimeoutId) {
      this.stop();
      this.autoplay = false;
    }

    this.movementStartX = event.touches[0].clientX;
    this.movementStartY = event.touches[0].clientY;
    this.isClicked = true;
  }

  touchend() {
    if (!this.imagesLoaded) return;

    this.movementStartX = 0;
    this.movementStartY = 0;
    this.isClicked = false;

    if (this.bottomCircle) this.show360ViewCircleIcon();
  }

  touchmove(event) {
    if (!this.isClicked || !this.imagesLoaded) return;

    this.onMove(event.touches[0].clientX, event.touches[0].clientY);
  }

  keydownGeneral() {
    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }
  }

  keydown(event) {
    if (!this.imagesLoaded) return;

    if (this.glass) {
      this.closeMagnifier();
    }

    if ([37, 39].includes(event.keyCode)) {
      if (37 === event.keyCode) {
        if (this.reversed)
          this.prev();
        else
          this.next();
      } else if (39 === event.keyCode) {
        if (this.reversed)
          this.next();
        else
          this.prev();
      }

      this.onSpin();
    }
  }

  onSpin() {
    if (this.bottomCircle) {
      this.hide360ViewCircleIcon();
    }

    if (this.view360Icon) {
      this.remove360ViewIcon();
    }

    if (this.autoplay || this.loopTimeoutId) {
      this.stop();
      this.autoplay = false;
    }
  }

  keyup(event) {
    if (!this.imagesLoaded) return;

    if ([37, 39].includes(event.keyCode)) {
      this.onFinishSpin();
    }
  }

  onFinishSpin() {
    if (this.bottomCircle) this.show360ViewCircleIcon();
  }

  onMove(pageX, pageY) {
    // X movement.
    if (pageX - this.movementStartX >= this.speedFactorX) {
      let itemsSkippedRight = Math.floor((pageX - this.movementStartX) / this.speedFactorX) || 1;

      this.movementStartX = pageX;

      if (this.spinReverse) {
        this.decreaseColumnIndex(itemsSkippedRight);
      } else {
        this.increaseColumnIndex(itemsSkippedRight);
      }

      if (this.bottomCircle) this.hide360ViewCircleIcon();
    } else if (this.movementStartX - pageX >= this.speedFactorX) {
      let itemsSkippedLeft = Math.floor((this.movementStartX - pageX) / this.speedFactorX) || 1;

      this.movementStartX = pageX;

      if (this.spinReverse) {
        this.increaseColumnIndex(itemsSkippedLeft);
      } else {
        this.decreaseColumnIndex(itemsSkippedLeft);
      }

      if (this.bottomCircle) this.hide360ViewCircleIcon();
    }

    // Y movement.
    if (pageY - this.movementStartY >= this.speedFactorY) {
      let itemsSkippedDown = Math.floor((pageY - this.movementStartY) / this.speedFactorY) || 1;

      this.movementStartY = pageY;

      if (this.spinReverse) {
        this.increaseRowIndex(itemsSkippedDown);
      } else {
        this.decreaseRowIndex(itemsSkippedDown);
      }

      if (this.bottomCircle) this.hide360ViewCircleIcon();
    } else if (this.movementStartY - pageY >= this.speedFactorY) {
      let itemsSkippedUp = Math.floor((this.movementStartY - pageY) / this.speedFactorY) || 1;

      this.movementStartY = pageY;

      if (this.spinReverse) {
        this.decreaseRowIndex(itemsSkippedUp);
      } else {
        this.increaseRowIndex(itemsSkippedUp);
      }

      if (this.bottomCircle) this.hide360ViewCircleIcon();
    }

    this.update();
  }

  // row: in {1, ..., this.rows}.
  // col: in {1, ..., this.cols}.
  getImageId(row, col) {
    return (row-1) * this.cols + col;
  }

  getActiveImageId() {
    return this.getImageId(this.activeRow, this.activeCol);
  }

  increaseColumnIndex(itemsSkipped) {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;

    if (this.stopAtEdgesX) {
      if (this.activeCol + itemsSkipped >= this.cols) {
        this.activeCol = this.cols;

        if (isReverse ? this.prevElem : this.nextElem) {
          addClass(isReverse ? this.prevElem : this.nextElem, 'not-active');
        }
      } else {
        this.activeCol += itemsSkipped;

        if (this.nextElem) {
          removeClass(this.nextElem, 'not-active');
        }

        if (this.prevElem) {
          removeClass(this.prevElem, 'not-active');
        }
      }
    } else {
      this.activeCol = (this.activeCol + itemsSkipped) % this.cols || this.cols;
    }
  }

  decreaseColumnIndex(itemsSkipped) {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;

    if (this.stopAtEdgesX) {
      if (this.activeCol - itemsSkipped <= 1) {
        this.activeCol = 1;

        if (isReverse ? this.nextElem : this.prevElem) {
          addClass(isReverse ? this.nextElem : this.prevElem, 'not-active');
        }
      } else {
        this.activeCol -= itemsSkipped;

        if (this.prevElem) {
          removeClass(this.prevElem, 'not-active');
        }
        if (this.nextElem) {
          removeClass(this.nextElem, 'not-active');
        }
      }
    } else {
      if (this.activeCol - itemsSkipped < 1) {
        this.activeCol = this.cols + (this.activeCol - itemsSkipped);
      } else {
        this.activeCol -= itemsSkipped;
      }
    }
  }

  increaseRowIndex(itemsSkipped) {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;

    if (this.stopAtEdgesY) {
      if (this.activeRow + itemsSkipped >= this.rows) {
        this.activeRow = this.rows;

        if (isReverse ? this.prevElem : this.nextElem) {
          addClass(isReverse ? this.prevElem : this.nextElem, 'not-active');
        }
      } else {
        this.activeRow += itemsSkipped;

        if (this.nextElem) {
          removeClass(this.nextElem, 'not-active');
        }

        if (this.prevElem) {
          removeClass(this.prevElem, 'not-active');
        }
      }
    } else {
      this.activeRow = (this.activeRow + itemsSkipped) % this.rows || this.rows;
    }
  }

  decreaseRowIndex(itemsSkipped) {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;

    if (this.stopAtEdgesY) {
      if (this.activeRow - itemsSkipped <= 1) {
        this.activeRow = 1;

        if (isReverse ? this.nextElem : this.prevElem) {
          addClass(isReverse ? this.nextElem : this.prevElem, 'not-active');
        }
      } else {
        this.activeRow -= itemsSkipped;

        if (this.prevElem) {
          removeClass(this.prevElem, 'not-active');
        }
        if (this.nextElem) {
          removeClass(this.nextElem, 'not-active');
        }
      }
    } else {
      if (this.activeRow - itemsSkipped < 1) {
        this.activeRow = this.rows + (this.activeRow - itemsSkipped);
      } else {
        this.activeRow -= itemsSkipped;
      }
    }
  }

  loop(reversed) {
    reversed ? this.prev() : this.next();
  }

  next() {
    this.increaseColumnIndex(1);
    this.update();
  }

  prev() {
    this.decreaseColumnIndex(1);
    this.update();
  }

  update() {
    const image = this.images[this.getActiveImageId() - 1];
    const ctx = this.canvas.getContext("2d");

    ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

    if (this.fullScreenView) {
      this.canvas.width = window.innerWidth * this.devicePixelRatio;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.height = window.innerHeight * this.devicePixelRatio;
      this.canvas.style.height = window.innerHeight + 'px';

      const { offsetX, offsetY, width, height } =
        contain(this.canvas.width, this.canvas.height, image.width, image.height);

      ctx.drawImage(image, offsetX, offsetY, width, height);
    } else {
      const width = image.width;
      this.canvas.width = width * this.devicePixelRatio;
      this.canvas.style.width = width + 'px';
      this.canvas.height = width * this.devicePixelRatio / image.width * image.height;
      this.canvas.style.height = width / image.width * image.height + 'px';

      ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  updatePercentageInLoader(percentage) {
    if (this.loader) {
      this.loader.style.width = percentage + '%';
    }

    if (this.view360Icon) {
      this.view360Icon.innerText = percentage + '%';
    }
  }

  onAllImagesLoaded() {
    this.imagesLoaded = true;
    this.container.style.cursor = 'grab';
    this.removeLoader();

    if (!this.fullScreenView) {
      this.speedFactorX = Math.floor(this.dragSpeed / 150 * 36 / this.cols * 25 * this.container.offsetWidth / 1500) || 1;
      this.speedFactorY = Math.floor(this.dragSpeed / 150 * 36 / this.rows * 25 * this.container.offsetHeight / 1500) || 1;
    } else {
      const containerRatio = this.container.offsetHeight / this.container.offsetWidth;
      let imageOffsetWidth = this.container.offsetWidth;
      let imageOffsetHeight = this.container.offsetHeight;

      // TODO: What is this for? Should it also be applied to height?
      if (this.ratio > containerRatio) {
        imageOffsetWidth = this.container.offsetHeight / this.ratio;
      }

      this.speedFactorX = Math.floor(this.dragSpeed / 150 * 36 / this.cols * 25 * imageOffsetWidth / 1500) || 1;
      this.speedFactorY = Math.floor(this.dragSpeed / 150 * 36 / this.rows * 25 * imageOffsetHeight / 1500) || 1;
    }

    if (this.autoplay) {
      this.play();
    }

    if (this.view360Icon) {
      this.view360Icon.innerText = '';
      setView360Icon(this.view360Icon, this.logoSrc);
    }

    this.initControls();
  }

  onFirstImageLoaded(event) {
    if (!this.hide360Logo) {
      this.add360ViewIcon();
    }

    if (this.fullScreenView) {
      this.canvas.width = window.innerWidth * this.devicePixelRatio;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.height = window.innerHeight * this.devicePixelRatio;
      this.canvas.style.height = window.innerHeight + 'px';

      const ctx = this.canvas.getContext("2d");

      const { offsetX, offsetY, width, height } =
        contain(this.canvas.width, this.canvas.height, event.target.width, event.target.height);

      ctx.drawImage(event.target, offsetX, offsetY, width, height);
    } else {
      const width = event.target.width;
      this.canvas.width = width * this.devicePixelRatio;
      this.canvas.style.width = width + 'px';
      this.canvas.height = width * this.devicePixelRatio / event.target.width * event.target.height;
      this.canvas.style.height = width / event.target.width * event.target.height + 'px';

      const ctx = this.canvas.getContext("2d");

      ctx.drawImage(event.target, 0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.lazyload && !this.fullScreenView) {
      this.images
        .forEach((image, index) => {
          if (index === 0) {
            this.innerBox.removeChild(this.lazyloadInitImage);
            return;
          }

          const dataSrc = image.getAttribute('data-src');

          if (dataSrc) {
            image.src = image.getAttribute('data-src');
          }
        });
    }

    if (this.ratio) {
      this.container.style.minHeight = 'auto';
    }

    if (this.magnifier && !this.fullScreenView) {
      this.addMagnifier();
    }

    if (this.boxShadow && !this.fullScreenView) {
      this.addBoxShadow();
    }

    if (this.bottomCircle && !this.fullScreenView) {
      this.add360ViewCircleIcon();
    }

    if (this.fullScreen && !this.fullScreenView) {
      this.addFullScreenIcon();
    } else if (this.fullScreenView) {
      this.addCloseFullScreenView();
    }
  }

  onImageLoad(index, event) {
    const percentage = Math.round(this.loadedImages / this.amount * 100);

    this.loadedImages += 1;
    this.updatePercentageInLoader(percentage);

    if (this.loadedImages === this.amount) {
      this.onAllImagesLoaded(event);
    } else if (index === 0) {
      this.onFirstImageLoaded(event);
    }
  }

  addCloseFullScreenView() {
    const closeFullScreenIcon = document.createElement('div');

    setCloseFullScreenViewStyles(closeFullScreenIcon);

    closeFullScreenIcon.onclick = this.closeFullScreenModal.bind(this);

    this.innerBox.appendChild(closeFullScreenIcon);
  }

  add360ViewIcon() {
    const view360Icon = document.createElement('div');

    set360ViewIconStyles(view360Icon);

    view360Icon.innerText = '0%';

    this.view360Icon = view360Icon;
    this.innerBox.appendChild(view360Icon);
  }

  addFullScreenIcon() {
    const fullScreenIcon = document.createElement('div');

    setFullScreenIconStyles(fullScreenIcon);

    fullScreenIcon.onclick = this.openFullScreenModal.bind(this);

    this.innerBox.appendChild(fullScreenIcon);
  }

  addMagnifier() {
    const magnifyIcon = document.createElement('div');

    setMagnifyIconStyles(magnifyIcon, this.fullScreen);

    magnifyIcon.onclick = this.magnify.bind(this);

    this.innerBox.appendChild(magnifyIcon);
  }

  getOriginalSrc() {
    const currentImage = this.images[this.getActiveImageId() - 1];
    const lastIndex = currentImage.src.lastIndexOf('//');

    return lastIndex > 10 ? currentImage.src.slice(lastIndex) : currentImage.src;
  }

  magnify() {
    const image = new Image();
    const src = this.getOriginalSrc();

    image.src = src;
    image.onload = () => {
      if (this.glass) {
        this.glass.style.cursor = 'none';
      }
    };

    this.glass = document.createElement('div');
    this.container.style.overflow = 'hidden';
    magnify(this.container, src, this.glass, this.magnifier || 3);
  }

  closeMagnifier() {
    if (!this.glass) return;

    this.container.style.overflow = 'visible';
    this.container.removeChild(this.glass);
    this.glass = null;
  }

  openFullScreenModal() {
    const fullScreenModal = document.createElement('div');

    setFullScreenModalStyles(fullScreenModal);

    const fullScreenContainer = this.container.cloneNode();
    const image = this.images[0];
    const ratio = image.height / image.width;

    fullScreenContainer.style.height = '100%';
    fullScreenContainer.style.maxHeight = '100%';

    fullScreenModal.appendChild(fullScreenContainer);

    window.document.body.appendChild(fullScreenModal);

    new CI360Viewer(fullScreenContainer, true, ratio);
  }

  closeFullScreenModal() {
    document.body.removeChild(this.container.parentNode);
  }

  add360ViewCircleIcon() {
    const view360CircleIcon = new Image();

    set360ViewCircleIconStyles(view360CircleIcon, this.bottomCircleOffset);

    this.view360CircleIcon = view360CircleIcon;
    this.innerBox.appendChild(view360CircleIcon);
  }

  hide360ViewCircleIcon() {
    if (!this.view360CircleIcon) return;

    this.view360CircleIcon.style.opacity = '0';
  }

  show360ViewCircleIcon() {
    if (!this.view360CircleIcon) return;

    this.view360CircleIcon.style.opacity = '1';
  }

  remove360ViewCircleIcon() {
    if (!this.view360CircleIcon) return;

    this.innerBox.removeChild(this.view360CircleIcon);
    this.view360CircleIcon = null;
  }

  addLoader() {
    const loader = document.createElement('div');

    setLoaderStyles(loader);

    this.loader = loader;
    this.innerBox.appendChild(loader);
  }

  addBoxShadow() {
    const boxShadow = document.createElement('div');

    setBoxShadowStyles(boxShadow, this.boxShadow);

    this.innerBox.appendChild(boxShadow);
  }

  removeLoader() {
    if (!this.loader) return;

    this.innerBox.removeChild(this.loader);
    this.loader = null;
  }

  remove360ViewIcon() {
    if (!this.view360Icon) return;

    this.innerBox.removeChild(this.view360Icon);
    this.view360Icon = null;
  }

  play() {
    if (this.bottomCircle) this.hide360ViewCircleIcon();
    this.remove360ViewIcon();

    this.loopTimeoutId = window.setInterval(() => {
      this.loop(this.reversed);
    }, this.autoplaySpeed);
  }

  stop() {
    if (this.bottomCircle) this.show360ViewCircleIcon();
    window.clearTimeout(this.loopTimeoutId);
  }

  getSrc(responsive, container, folder, filename, { ciSize, ciToken, ciOperation, ciFilters }) {
    let src = `${folder}${filename}`;

    if (responsive) {
      let imageOffsetWidth = container.offsetWidth;

      if (this.fullScreenView) {
        const containerRatio = container.offsetHeight / container.offsetWidth;

        if (this.ratio > containerRatio) {
          imageOffsetWidth = container.offsetHeight / this.ratio;
        }
      }

      const ciSizeNext = getSizeAccordingToPixelRatio(ciSize || getResponsiveWidthOfContainer(imageOffsetWidth));

      src = `https://${ciToken}.cloudimg.io/${ciOperation}/${ciSizeNext}/${ciFilters}/${src}`;
    }

    return src;
  }

  preloadImages(amount, src, lazyload, lazySelector, container, responsive, ciParams) {
    if (this.imageList) {
      try {
        const images = JSON.parse(this.imageList);

        this.amount = images.length;
        images.forEach((src, index) => {
          const folder = /(http(s?)):\/\//gi.test(src) ? '' : this.folder;
          const resultSrc = this.getSrc(responsive, container, folder, src, ciParams);

          this.addImage(resultSrc, lazyload, lazySelector, index);
        });
      } catch (error) {
        console.error(`Wrong format in image-list attribute: ${error.message}`);
      }
    } else {
      [...new Array(amount)].map((_item, index) => {
        // TODO: Changed to use zero-based index here, but I'm not sure if this
        // is the only place that needs to be changed.
        const nextZeroFilledIndex = pad(index, this.indexZeroBase);
        const resultSrc = src.replace('{index}', nextZeroFilledIndex);
        this.addImage(resultSrc, lazyload, lazySelector, index);
      });
    }
  }

  addImage(resultSrc, lazyload, lazySelector, index) {
    const image = new Image();

    if (lazyload && !this.fullScreenView) {
      image.setAttribute('data-src', resultSrc);
      image.className = image.className.length ? image.className + ` ${lazySelector}` : lazySelector;

      if (index === 0) {
        this.lazyloadInitImage = image;
        image.style.position = 'absolute';
        image.style.top = '0';
        image.style.left = '0';
        this.innerBox.appendChild(image);
      }
    } else {
      image.src = resultSrc;
    }

    image.onload = this.onImageLoad.bind(this, index);
    image.onerror = this.onImageLoad.bind(this, index);
    this.images.push(image);
  }

  destroy() {
    stop();

    const oldElement = this.container;
    const newElement = oldElement.cloneNode(true);
    const innerBox = newElement.querySelector('.cloudimage-inner-box');

    newElement.className = newElement.className.replace(' initialized', '');
    newElement.style.position = 'relative';
    newElement.style.width = '100%';
    newElement.style.cursor = 'default';
    newElement.setAttribute('draggable', 'false');
    newElement.style.minHeight = 'auto';
    newElement.removeChild(innerBox);
    oldElement.parentNode.replaceChild(newElement, oldElement);
  }

  initControls() {
    const isReverse = this.controlReverse ? !this.spinReverse : this.spinReverse;
    const prev = this.container.querySelector('.cloudimage-360-prev');
    const next = this.container.querySelector('.cloudimage-360-next');

    if (!prev && !next) return;

    const onLeftStart = (event) => {
      event.stopPropagation();
      this.onSpin();
      this.prev();
      this.loopTimeoutId = window.setInterval(this.prev.bind(this), this.autoplaySpeed);
    };
    const onRightStart = (event) => {
      event.stopPropagation();
      this.onSpin();
      this.next();
      this.loopTimeoutId = window.setInterval(this.next.bind(this), this.autoplaySpeed);
    };
    const onLeftEnd = () => {
      this.onFinishSpin();
      window.clearTimeout(this.loopTimeoutId);
    };
    const onRightEnd = () => {
      this.onFinishSpin();
      window.clearTimeout(this.loopTimeoutId);
    };

    if (prev) {
      prev.style.display = 'block';
      prev.addEventListener('mousedown', isReverse ? onRightStart : onLeftStart);
      prev.addEventListener('touchstart', isReverse ? onRightStart : onLeftStart);
      prev.addEventListener('mouseup', isReverse ? onRightEnd : onLeftEnd);
      prev.addEventListener('touchend', isReverse ? onRightEnd : onLeftEnd);

      this.prevElem = prev;
    }

    if (next) {
      next.style.display = 'block';
      next.addEventListener('mousedown', isReverse ? onLeftStart : onRightStart);
      next.addEventListener('touchstart', isReverse ? onLeftStart : onRightStart);
      next.addEventListener('mouseup', isReverse ? onLeftEnd : onRightEnd);
      next.addEventListener('touchend', isReverse ? onLeftEnd : onRightEnd);

      this.nextElem = next;
    }

    if (isReverse ? next : prev) {
      // TODO: How does this work with Y-axis?
      if (this.stopAtEdgesX) {
        addClass(isReverse ? next : prev, 'not-active');
      }
    }
  }

  addInnerBox() {
    this.innerBox = document.createElement('div');
    this.innerBox.className = 'cloudimage-inner-box';
    this.container.appendChild(this.innerBox);
  }

  addCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.fontSize = '0';

    if (this.ratio) {
      this.container.style.minHeight = this.container.offsetWidth * this.ratio + 'px';
      this.canvas.height = parseInt(this.container.style.minHeight);
    }

    this.innerBox.appendChild(this.canvas);
  }

  attachEvents(draggable, swipeable, keys) {
    if (draggable) {
      this.container.addEventListener('mousedown', this.mousedown.bind(this));
      this.container.addEventListener('mouseup', this.mouseup.bind(this));
      this.container.addEventListener('mousemove', this.mousemove.bind(this));
    }

    if (swipeable) {
      this.container.addEventListener('touchstart', this.touchstart.bind(this), { passive: true });
      this.container.addEventListener('touchend', this.touchend.bind(this), { passive: true });
      this.container.addEventListener('touchmove', this.touchmove.bind(this));
    }

    if (keys) {
      document.addEventListener('keydown', this.keydown.bind(this));
      document.addEventListener('keyup', this.keyup.bind(this));
    } else {
      document.addEventListener('keydown', this.keydownGeneral.bind(this));
    }
  }

  applyStylesToContainer() {
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.cursor = 'wait';
    this.container.setAttribute('draggable', 'false');
    this.container.className = `${this.container.className} initialized`;
  }

  init(container) {
    let {
      folder, filename, imageList, indexZeroBase, amount, rows, cols, draggable = true, swipeable = true, keys, bottomCircle, bottomCircleOffset, boxShadow,
      autoplay, speed, autoplayReverse, fullScreen, magnifier, ratio, responsive, ciToken, ciSize, ciOperation,
      ciFilters, lazyload, lazySelector, spinReverse, dragSpeed, stopAtEdgesX, stopAtEdgesY, controlReverse, hide360Logo, logoSrc
    } = get360ViewProps(container);
    const ciParams = { ciSize, ciToken, ciOperation, ciFilters };

    this.addInnerBox();
    this.addLoader();

    this.folder = folder;
    this.filename = filename;
    this.imageList = imageList;
    this.indexZeroBase = indexZeroBase;
    this.amount = amount;
    this.rows = rows;
    this.cols = cols;
    this.bottomCircle = bottomCircle;
    this.bottomCircleOffset = bottomCircleOffset;
    this.boxShadow = boxShadow;
    this.autoplay = autoplay && !this.isMobile;
    this.speed = speed;
    this.reversed = autoplayReverse;
    this.fullScreen = fullScreen;
    this.magnifier = !this.isMobile && magnifier ? magnifier : false;
    this.lazyload = lazyload;
    this.ratio = ratio;
    this.spinReverse = spinReverse;
    this.controlReverse = controlReverse;
    this.dragSpeed = dragSpeed;
    this.autoplaySpeed = this.speed * 36 / this.amount;
    this.stopAtEdgesX = stopAtEdgesX;
    this.stopAtEdgesY = stopAtEdgesY;
    this.hide360Logo = hide360Logo;
    this.logoSrc = logoSrc;

    this.applyStylesToContainer();

    this.addCanvas();

    let src = this.getSrc(responsive, container, folder, filename, ciParams);

    this.preloadImages(amount, src, lazyload, lazySelector, container, responsive, ciParams);

    this.attachEvents(draggable, swipeable, keys);
  }
}

export default CI360Viewer;
