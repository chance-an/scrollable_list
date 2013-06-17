Scrollable List
===============

Usage
=====
```js
$(domNode).scrollableList(options);
```

* `option` is an object with follwing properties available.
 * `width` : {int} the width of the list
 * `height` : {int} the height of the list
 * `getData` : a function to pull out the data dynamically.
   `function(offset, count)` @return {Array}
 * `renderRow` : a function to render a data row
   `function(row)` @return {DOM|string}

Example
======
```js
    $('#simple-list').scrollableList({
        width: 200,
        height: 200,
        getData : dataFeeder,
        renderRow : renderRow
    });

    var pseudoId = 0;

    function dataFeeder(offset, count){
        var deferred = new $.Deferred();
        var data = [];
        for(var i = 0; i < count; i++){
            data.push({
                title : 'Sample Data ' + (pseudoId++)
            });
        }
        return deferred.resolve(data);
    }

    function renderRow(rowData){
        return '<div style="width:100%; height: 33px;">'+ rowData.title +'</div>';
    }
```
