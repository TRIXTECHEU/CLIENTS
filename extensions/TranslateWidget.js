/* TrixTech s.r.o. @2026 */

(function () {
  const WIDGET_ID = 'voiceflow-chat';

  const translate = (val) => {
    if (typeof val !== 'string') return val;
    const low = val.toLowerCase();
    if (low.includes('open')) return 'Otevřít chat';
    if (low.includes('close')) return 'Zavřít chat';
    if (low === 'send') return 'Odeslat';
    if (low.includes('hide messages') || low === 'hide') return 'Skrýt zprávy';
    return val;
  };

  const isInsideWidget = (el) => {
    try {
      if (el.id === WIDGET_ID) return true;
      const rootNode = el.getRootNode();
      return !!(
        rootNode &&
        rootNode.host &&
        (rootNode.host.id === WIDGET_ID || rootNode.host.closest?.('#' + WIDGET_ID))
      );
    } catch (e) {
      return false;
    }
  };

  const orgSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (
      (name === 'title' || name === 'aria-label' || name === 'data-balloon') &&
      isInsideWidget(this)
    ) {
      value = translate(value);
    }
    return orgSetAttr.call(this, name, value);
  };

  const orgTitleDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'title');
  Object.defineProperty(HTMLElement.prototype, 'title', {
    get: function () {
      return orgTitleDesc.get.call(this);
    },
    set: function (value) {
      orgTitleDesc.set.call(this, isInsideWidget(this) ? translate(value) : value);
    }
  });

  let observer = null;
  let isApplying = false;
  let checkAttempts = 0;
  const maxCheckAttempts = 40;

  function runFix() {
    const host = document.getElementById(WIDGET_ID);
    const root = host?.shadowRoot;
    if (!root) {
      checkAttempts++;
      if (checkAttempts < maxCheckAttempts) {
        setTimeout(runFix, 250);
      }
      return;
    }
    if (observer) return;

    const apply = () => {
      if (isApplying) return;
      isApplying = true;
      try {
        root
          .querySelectorAll('.vfrc-launcher, .vfrc-chat-input--button, button[title], [aria-label]')
          .forEach((el) => {
            const t = el.title || el.getAttribute('aria-label') || '';
            const fixed = translate(t);
            if (t !== fixed) {
              orgTitleDesc.set.call(el, fixed);
              orgSetAttr.call(el, 'aria-label', fixed);
            }
          });
      } catch (e) {
        console.warn('TranslateWidget error:', e);
      } finally {
        isApplying = false;
      }
    };

    let debounceTimer = null;
    observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(apply, 100);
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title', 'aria-label']
    });
    apply();
  }

  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFix);
  } else {
    runFix();
  }
})();
