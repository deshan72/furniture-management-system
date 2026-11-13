/**
 * Non-blocking, isolated printing & report generation utility for D N S Home Solutions.
 * 
 * Prevents browser thread lock, popup blocker issues, and page reload hangs
 * by using a clean invisible iframe with automatic DOM cleanup, or an isolated
 * window with detached opener (opener = null) and self-closing afterprint listener.
 */

export const printHtmlDocument = (htmlContent, options = {}) => {
  const { title = 'DNS_Document', onComplete = null } = options;

  try {
    // 1. Clean up any leftover print frames from previous prints
    const oldFrame = document.getElementById('dns-safe-print-frame');
    if (oldFrame) {
      try {
        oldFrame.remove();
      } catch {}
    }

    // 2. Create invisible sandbox iframe attached to document.body
    const iframe = document.createElement('iframe');
    iframe.id = 'dns-safe-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      throw new Error('Iframe document inaccessible, using popup fallback');
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Small delay to allow images (like logo) and layout styles to render properly
    setTimeout(() => {
      try {
        const frameWin = iframe.contentWindow;
        if (!frameWin) {
          throw new Error('Frame window unavailable');
        }

        frameWin.focus();

        // Listen for afterprint to clean up
        const cleanup = () => {
          setTimeout(() => {
            try {
              const frame = document.getElementById('dns-safe-print-frame');
              if (frame) frame.remove();
            } catch {}
            if (typeof onComplete === 'function') onComplete();
          }, 300);
        };

        try {
          frameWin.addEventListener('afterprint', cleanup, { once: true });
        } catch {}

        frameWin.print();

        // Fallback cleanup timer in case afterprint does not fire in some browsers
        setTimeout(cleanup, 4000);
      } catch (printErr) {
        console.warn('Iframe print failed, falling back to detached window:', printErr);
        fallbackPrintWindow(htmlContent, title, onComplete);
      }
    }, 350);
  } catch (err) {
    console.warn('Iframe setup failed, falling back to detached window:', err);
    fallbackPrintWindow(htmlContent, title, onComplete);
  }
};

/**
 * Fallback popup window with severed opener (printWindow.opener = null)
 * to prevent Chromium thread lock and endless page reload spinners.
 */
function fallbackPrintWindow(htmlContent, title, onComplete) {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented opening the print document. Please allow popups for this site or download CSV.');
      return;
    }

    // Inject self-closing script into HTML before closing document
    const selfClosingScript = `
      <script>
        (function() {
          function safeClose() {
            setTimeout(function() {
              try { window.close(); } catch(e) {}
            }, 100);
          }
          window.addEventListener('afterprint', safeClose);
          setTimeout(function() {
            try {
              window.focus();
              window.print();
            } catch(e) {}
          }, 300);
        })();
      </script>
    `;

    const injectedHtml = htmlContent.includes('</body>')
      ? htmlContent.replace('</body>', `${selfClosingScript}</body>`)
      : `${htmlContent}${selfClosingScript}`;

    printWindow.document.open();
    printWindow.document.write(injectedHtml);
    printWindow.document.close();

    // Sever opener link to prevent parent thread freeze on reload
    try {
      printWindow.opener = null;
    } catch {}

    if (typeof onComplete === 'function') {
      setTimeout(onComplete, 500);
    }
  } catch (popupErr) {
    console.error('Failed to open detached print window:', popupErr);
  }
}

/**
 * Direct file download helper for standalone HTML reports
 */
export const downloadHtmlReport = (filename, htmlContent) => {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Failed to download HTML report:', err);
  }
};

