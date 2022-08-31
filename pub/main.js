var objects = [];

fetch("/config-list-get").then((response) => {
    document.getElementById("main").innerHTML = "";
    response.json().then((data) => {
        objects = data.configs;
        var curCategory = "";
        var curFile = "";
        data.configs.forEach((item, i) => {
            item.name = item.name || " ";
            var contentField = "";
            if (item.file != curFile){
                curCategory = "";
                curFile = item.file;
            }
            if (item.content != undefined){
                contentField = "<div class='content'><p>" + (item.content - 0 != item.content ? item.content.replace("\n", "<br>") : item.content) + "</p></div>";
                if (item.type == "number"){
                    contentField = "<div class='content'><input type='number' class='numberInput' onchange='inputValueChanged(this)'></input></div>";
                }
                else if (item.type == "string"){
                    contentField = "<div class='content'><input type='text' class='stringInput' onchange='inputValueChanged(this)'></input></div>";
                }
                else if (item.type == "bool"){
                    contentField = "<div class='content'><input type='checkbox' onchange='inputValueChanged(this)' class='boolInput' id='inp-" + i + "'></input><label class='boolSlider' for='inp-" + i + "'></label></div>";
                }
            }
            if (item.type == "category"){
                //document.getElementById("main").innerHTML += "<div class='category'><div class='file'>" + item.file + "</div><div class='cat-name'>---------- " + item.name + " ----------</div></div>"
                curCategory = item.name;
            }
            else{
                var catHTML = (curCategory == "" ? "" : "<br>---" + curCategory + "---");
                document.getElementById("main").innerHTML += "<div class='entry' data-index='" + i + "'><div class='file'>" + item.file + catHTML + "</div><div class='type'>" + item.type + "</div><div class='name'>" + item.name + "</div>" + contentField + "</div>";
                document.getElementById("main").lastChild.lastChild.children[0].setAttribute("data-value", item.content);
            }
            requestAnimationFrame(() => {
                Array.from(document.getElementsByTagName("input")).forEach((lastField, i) => {
                    if (lastField.classList.contains("boolInput")){
                        lastField.checked = lastField.getAttribute("data-value") == "true";
                    }
                    else{
                        lastField.value = lastField.getAttribute("data-value");
                    }
                    if (lastField.classList.contains("numberInput")){
                        lastField.addEventListener("keypress", validateKey);
                    }
                    else if (lastField.classList.contains("stringInput")){
                        lastField.addEventListener("keydown", validateStringKey);
                    }
                });
            });
        });
    });
});

function validateKey(evt){
    if ((/[0-9\/]+\.[0-9\/]+|[0-9\/]+/).test(evt.key)){
        return;
    }
    evt.preventDefault();
}

function validateStringKey(evt){
    var key = evt.keyCode || evt.charCode;
    if (evt.target.value.length <= 1 && key == 8){
        evt.preventDefault();
    }
}

function inputValueChanged(el){
    var index = el.parentNode.parentNode.getAttribute("data-index");
    var dataEntry = objects[index];
    var changeType = "content-unknown";
    var changeValue = el.value;
    if (el.classList.contains("numberInput")){
        changeType = "content-number";
    }
    else if (el.classList.contains("stringInput")){
        changeType = "content-string";
    }
    else if (el.classList.contains("boolInput")){
        changeType = "content-bool";
        changeValue = el.checked;
    }
    fetch("/config-edit", {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            configToEdit: index,
            changeType: changeType,
            changeValue: changeValue
        })
    });
}
