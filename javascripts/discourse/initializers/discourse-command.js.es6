import { iconHTML } from "discourse-common/lib/icon-library";
import { withPluginApi } from "discourse/lib/plugin-api";

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
  name: "discourse-cmd",

  initialize() {
    withPluginApi("0.8.7", api => {
      function _cleanUp() {
        if (_clickHandlerElement) {
          _clickHandlerElement.off("click", ".copy-cmd");
          _clickHandlerElement = null;
        }
      }

      function _attachCommands($elem, post) {
        const $commands = $("pre > code", $elem);

        if (!$commands.length) {
          return;
        }

        _clickHandlerElement = $commands;

        $commands
          .each((idx, command) => {
            command.setAttribute("data-value", command.innerText);
            const $button = $(
              `<button class="btn copy-cmd">${I18n.t(themePrefix('command.copy'))}</button>`
            );
            $(command).append($button);
          })
          .on("click", ".copy-cmd", event => {
            let string = event.target.parentNode.getAttribute("data-value");
            if (string) {
              string = string.replace(/^\s+|\s+$/g, "");
              clipboardCopy(string);
            }
            event.currentTarget.childNodes[0].innerHTML = I18n.t(themePrefix('command.copied'));
            setTimeout(() => {event.currentTarget.childNodes[0].innerHTML = I18n.t(themePrefix('command.copy'))}, 200);
          });
      }

      api.decorateCooked(_attachCommands, {
        id: "discourse-cmd"
      });

      api.cleanupStream(_cleanUp);
    });
  }
};
