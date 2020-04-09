import { withPluginApi } from "discourse/lib/plugin-api";

import { Promise } from "rsvp";

// http://github.com/feross/clipboard-copy
function clipboardCopy(text) {
  // Use the Async Clipboard API when available. Requires a secure browsing
  // context (i.e. HTTPS)
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text).catch(function(err) {
      throw err !== undefined
        ? err
        : new DOMException("The request is not allowed", "NotAllowedError");
    });
  }

  // ...Otherwise, use document.execCommand() fallback

  // Put the text to copy into a <span>
  var span = document.createElement("span");
  span.textContent = text;

  // Preserve consecutive spaces and newlines
  span.style.whiteSpace = "pre";

  // Add the <span> to the page
  document.body.appendChild(span);

  // Make a selection object representing the range of text selected by the user
  var selection = window.getSelection();
  var range = window.document.createRange();
  selection.removeAllRanges();
  range.selectNode(span);
  selection.addRange(range);

  // Copy text to the clipboard
  var success = false;
  try {
    success = window.document.execCommand("copy");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("error", err);
  }

  // Cleanup
  selection.removeAllRanges();
  window.document.body.removeChild(span);

  return success
    ? Promise.resolve()
    : Promise.reject(
        new DOMException("The request is not allowed", "NotAllowedError")
      );
}

let _clickHandlerElement = null;

export default {
  name: "discourse-copy-codeblocks",

  initialize() {
    withPluginApi("0.8.7", api => {
      function _cleanUp() {
        if (_clickHandlerElement) {
          _clickHandlerElement.removeEventListener("click", _handleClick);
          _clickHandlerElement = null;
        }
      }

      function _handleClick(event) {
        if (!event.target.classList.contains("copy-cmd")) {
          return;
        }

        const button = event.target;
        const code = button.nextSibling;

        if (code) {
          let string = code.innerText;

          if (string) {
            string = string.replace(/^\s+|\s+$/g, "");
            clipboardCopy(string);
          }

          button.innerHTML = I18n.t(themePrefix("codeblocks.copied"));

          Ember.run.later(
            () => (button.innerHTML = I18n.t(themePrefix("codeblocks.copy"))),
            200
          );
        }
      }

      function _attachCommands($elem) {
        const commands = $elem[0].querySelectorAll("pre > code");

        if (!commands.length) {
          return;
        }

        _clickHandlerElement = $elem[0];

        commands.forEach(command => {
          const button = document.createElement("button");
          button.classList.add("btn", "nohighlight", "copy-cmd");
          button.innerText = I18n.t(themePrefix("codeblocks.copy"));
          command.before(button);
          command.parentElement.classList.add("discourse-copy-codeblocks");
        });

        _clickHandlerElement.addEventListener("click", _handleClick, false);
      }

      api.decorateCooked(_attachCommands, { id: "discourse-copy-codeblocks" });

      api.cleanupStream(_cleanUp);
    });
  }
};
