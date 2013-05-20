(function(){
    "use strict";

    function initialize(){
        $('#simple-list').scrollableList({
            width: 200,
            height: 200,
            getData : dataFeeder,
            renderRow : renderRow
        });
    }

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

    $(document).ready(initialize);
})();