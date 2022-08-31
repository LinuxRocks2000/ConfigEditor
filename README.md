# ConfigEditor
A general-purpose configuration editor for Linux.

## How to use
Clone the source and `npm install`, then run `node base.js`.  
As you've probably guessed, this is a node.js app.

It will start an Express server at localhost:8000, you can change this in `configeditor.json`. If you want to actually use it, add more config directories in `configeditor.json` (Note: you absolutely *must* have a slash after directory names! I'm working on fixing this) and restart base.js.  
Visit localhost:8000 (or whatever you configured it as) to edit config files in your directories.

I'm working on adding JSON config file editing support.
