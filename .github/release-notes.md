## Install

1. Download `camunda-navigator.zip` below.
2. Extract it. You get a single `camunda-navigator` folder.
3. Move that folder into your Camunda Modeler plugins directory:
   - **Windows:** `%AppData%\camunda-modeler\resources\plugins`
   - **macOS:** `~/Library/Application Support/camunda-modeler/resources/plugins`
   - **Linux:** `~/.config/camunda-modeler/resources/plugins`
4. Restart Camunda Modeler.

The result must be `.../resources/plugins/camunda-navigator/index.js`. The Modeler
discovers plugins by globbing `resources/plugins/*/index.js`, so the plugin folder
has to sit directly inside `plugins`, not nested one level deeper.

---
