const express = require("express");
var app = express();
const bodyParser = require("body-parser");
const expressWS = require("express-ws")(app);

const fs = require("fs");

var globalConfig = undefined;

var filesToCheck = [];

function reloadConf(){
    globalConfig = JSON.parse(fs.readFileSync("configeditor.json"));
    filesToCheck = [];
    globalConfig.configDirs.forEach((item, i) => {
        fs.readdir(item, (err, files) => {
            if (files){
                files.forEach((file, i) => {
                    if (file.endsWith(".conf") || file.endsWith(".cnf") || file.endsWith(".json")){
                        filesToCheck.push(item + file);
                    }
                });
            }
        });
    });
}
reloadConf();

app.use(express.static("pub"));

app.use(bodyParser.json());

function isAlphaNumeric(str) { /* Thank you, StackOverflow! */
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
}

function isNumeric(str){
    return !isNaN(str);
}

function stripWhitespace(string){
    for (var start = 0; start < string.length; start ++){
        if (string[start] != " "){
            break;
        }
    }
    for (var end = string.length - 1; end > 0; end --){
        if (string[end] != " " && string[end] != "" && string[end] != "\n"){
            break;
        }
    }
    return string.substr(start, end + 1);
}

class IndexableIOWrapper{
    constructor(data){
        this.indexable = data;
        this.index = 0;
        this.column = 0;
        this.line = 0;
        this.lastLineColumn = 0;
    }
    read(){
        this.index ++;
        this.column = 0;
        this.line = 0;
        for (var i = 0; i < this.index; i ++){
            this.column ++;
            if (this.indexable[i] == "\n"){
                this.lastLineColumn = this.column;
                this.column = 0;
                this.line ++;
            }
        }
        return this.indexable[this.index - 1];
    }
    empty(){
        return this.index >= this.indexable.length;
    }
    readOutUntil(character){
        if (!Array.isArray(character)){
            character = [character];
        }
        var c = "";
        var ret = "";
        while (!this.empty() && character.indexOf(c) == -1){
            ret += c;
            c = this.read();
        }
        this.index --; // Pull back from that character.
        return ret;
    }
    readString(){
        return this.readOutUntil('"');
    }
}


function parseCNF(data, file){ /* Parse any Unix-formatted cnf file. */
    var io = new IndexableIOWrapper(data.toString());
    var ret = [];
    while (!io.empty()){
        var char = io.read();
        if (char == "#"){
            var line = io.line;
            var column = io.column;
            var dt = io.readOutUntil("\n");
            if (ret.length > 0 && ret[ret.length - 1].type == "comment"){
                ret[ret.length - 1].content += "\n" + dt;
            }
            else{
                ret.push({
                    type: "comment",
                    content: dt,
                    file: file,
                    column: column,
                    line: line,
                    size: (io.column == 0 ? io.lastLineColumn : io.column) - column
                });
            }
            continue;
        }
        else if (isAlphaNumeric(char) || ["-", ".", "_"].indexOf(char) != -1){
            var line = io.line;
            var column = io.column;
            var name = stripWhitespace(char + io.readOutUntil(["=", "\n"]));
            io.read();
            var content = stripWhitespace(io.readOutUntil(["\n", "#"]));
            var d = {
                type: "none",
                name: name,
                file: file,
                line: line,
                column: column,
                size: (io.column == 0 ? io.lastLineColumn : io.column) - column
            };
            if (content != ''){
                if (["true", "yes"].indexOf(content.toLowerCase()) != -1){
                    d.type = "bool";
                    d.content = true;
                }
                else if (["false", "no"].indexOf(content.toLowerCase()) != -1){
                    d.type = "bool";
                    d.content = false;
                }
                else if (isNumeric(content)){
                    d.type = "number";
                    d.content = parseFloat(content);
                }
                else {
                    d.type = "string";
                    d.content = content;
                }
            }
            ret.push(d);
        }
        else if (char == "["){
            var categoryName = io.readOutUntil("]");
            ret.push({
                type: "category",
                name: categoryName,
                file: file
            });
        }
    }
    return ret;
}

var objects = [];

app.get("/config-list-get", (req, res) => {
    console.log("Reading from files: ");
    console.log(filesToCheck);
    var response = [];

    filesToCheck.forEach((item, i) => {
        if (item.endsWith(".conf") || item.endsWith(".cnf")){
            response.push(...parseCNF(fs.readFileSync(item), item));
        }
    });

    objects = response;

    res.send({
        configs: response
    });
});

app.post("/config-edit", (req, res) => {
    var obj = objects[req.body.configToEdit];
    if (req.body.changeType == "content-number"){
        objects[req.body.configToEdit].content = req.body.changeValue - 0;
    }
    else if (req.body.changeType == "content-string"){
        objects[req.body.configToEdit].content = req.body.changeValue;
    }
    else if (req.body.changeType == "content-bool"){
        objects[req.body.configToEdit].content = req.body.changeValue;
    }
    var initial = new IndexableIOWrapper(fs.readFileSync(obj.file).toString());
    var newFile = "";
    while (!initial.empty()){
        var char = initial.read();
        if (initial.line != obj.line || initial.column < obj.column || initial.column > obj.column + obj.size){
            newFile += char;
        }
        else{
            newFile += obj.name + " = " + obj.content;
            initial.readOutUntil("\n");
        }
    }
    fs.writeFileSync(obj.file, newFile);
    res.send();
});

app.listen(globalConfig.port, () => {
    console.log("app is live");
});
