/**
 *
 */
(function ($) {
    "use strict";

    var DEFAULT_OPTIONS = {
        // These are the defaults.
        width: null,
        height: null,

        getData: defaultGetData,
        renderRow: defaultRenderRow
    };

    var DATA_FETCH_SIZE = 10;


    function defaultGetData () {
        return ($.Deferred()).resolve([]);
    }

    function defaultRenderRow (){
        return '';
    }


    $.fn.scrollableList = function (options) {
        var settings = $.extend(DEFAULT_OPTIONS, options);

        var instance = new ScrollableList(this, settings);
        _layout(instance);
        instance.start();
        _render(instance);
    };


    function ScrollableList($element, settings){
        this.$element = $element;
        $.extend(this, settings || {});
    }
    //private
    /**
     * convert the element to have required markups for implementing scrollable list
     * @param self ScrollableList
     * @private
     */
    function _layout(self){
        self.$element.empty()
            .width(self.width)
            .height(self.height)
            .css({
                overflow : 'scroll'
            })
            .addClass('scrollableList');

        self.$spacerTop = $('<div/>')
            .appendTo(self.$element)
            .height(0)
            .addClass('scrollable-list-item scrollable-list-spacer');
        self.$spacerBottom= $('<div/>')
            .appendTo(self.$element)
            .height(0)
            .addClass('scrollable-list-item scrollable-list-spacer');
    }

    function _render(self){
        var contentHeight = _calculateContentHeight(self);
        var scrollPosition = self.$element.scrollTop();

        _getEntriesToShow(self, contentHeight, scrollPosition).done(function(firstEntryIndex, lastEntryIndex){
            var previousEntryIndex = firstEntryIndex - 1;
            if(previousEntryIndex >= 0){
                self.$spacerTop.height(self._data[previousEntryIndex].bottom);
                //so after this, all the entries before firstEntryIndex are all cascaded into one $spacerTop element
            }else{
                self.$spacerTop.height(0);
            }

            //TODO selectively update, instead of removing all
            self.$element.find('.scrollable-list-item:not(.scrollable-list-spacer)').remove();

            //A div to hold the rendered row markup
            var $tempDiv = $('<div/>').appendTo('body');
            for(var i = lastEntryIndex; i >= firstEntryIndex; i-- ){
                var $children = $tempDiv.empty().html(self.renderRow(self._data[i].data)).children();
                $children.addClass('scrollable-list-item');
                //TODO it probably only makes sense to pick up the first child
                self.$spacerTop.after($children);
            }
            $tempDiv.remove();

            //update $spacerBottom
            if(self._maxEntriesDrawn > lastEntryIndex){
                var contentBottomPosition = self._data[self._maxEntriesDrawn].bottom;
                var renderedEntryBottom = self._data[lastEntryIndex].bottom;
                self.$spacerBottom.height(contentBottomPosition - renderedEntryBottom);
                //so after this, all the entries after lastEntryIndex are all cascaded into one $spacerBottom element
            }else{
                self._maxEntriesDrawn = lastEntryIndex;
                self.$spacerBottom.height(0);
            }

            //make sure the scrollTop is the same after re-rendering
            self.$element.scrollTop(scrollPosition);
        });
    }

    function _calculateContentHeight(self){
        var $lastChild = self.$element.find('.scrollable-list-item:last-child');
        var $pseudoElement = $('<div/>').insertAfter($lastChild);
        var height = $pseudoElement.position().top;
        $pseudoElement.remove();
        return height;
    }

    function _getEntriesToShow(self, contentHeight, scrollPosition){
        var deferred = new $.Deferred();

        //supplement enough data to reach scrollPosition + listHeight
        var dataHeightToReach = scrollPosition + self.height;
        var signalEnoughData = new $.Deferred();
        var _lastSeenBottom = null;
        function _check(){
            var lastElementIndex = self._data.length - 1;
            if( lastElementIndex >= 0 && self._data[lastElementIndex] ){
                var lastElement = self._data[lastElementIndex];
                if(lastElement.bottom  === _lastSeenBottom){
                    // the height doesn't increase after new data is loaded in, probably rendering problem,
                    // quit to avoid infinite loop
                    signalEnoughData.reject();
                    throw Error('The loaded data doesn\'t render itself');
                }else{
                    _lastSeenBottom = lastElement.bottom;
                }
                if(lastElement.bottom >= dataHeightToReach){
                    signalEnoughData.resolve();
                    return;
                }
            }

            self.getData(self._data.length, DATA_FETCH_SIZE).done(function(data){
                if( !(data instanceof Array) || data.length === 0){
                    signalEnoughData.resolve(); // cannot get any more data, have to proceed
                    return;
                }
                _storeData(self, data);
                _check();
            });
        }
        _check();

        signalEnoughData.done(function(){
            //find the first entry that should be displayed
            var firstEntryIndexInView = self._data.binarySearch(scrollPosition, function(a, b){
                if(a.top <= b && a.bottom >=b){
                    return 0;
                }else if(a.bottom < b){
                    return -1;
                }else{
                    return 1;
                }
            });
            //find the last entry that should be displayed
            var lastEntryIndexInView = firstEntryIndexInView;
            while( lastEntryIndexInView < self._data.length &&
                self._data[lastEntryIndexInView].bottom < dataHeightToReach){
                lastEntryIndexInView ++;
            }
            deferred.resolve(firstEntryIndexInView, lastEntryIndexInView);
        });

        return deferred;
    }

    function _storeData(self, data){
        var length = self._data.length;
        var offset = length > 0 ? self._data[length - 1].bottom : 0;
        var $tempDiv = $('<div/>').appendTo('body');
        $.each(data, function(index, entry){
            var presentation = self.renderRow(entry);
            $tempDiv.empty().html(presentation);
            var height = $tempDiv.outerHeight();
            var bottom = offset + height;
            self._data.push({
                top : offset,
                height : height,
                bottom : bottom,
                data: entry
            });
            offset = bottom;
        });
        $tempDiv.remove();
    }

    function _monitorEvents(self){
        self.$element.on('scroll', function(instance){
            return debounce(function(){
                Events.onScroll.apply(instance.$element, [instance].concat($.makeArray(arguments)) );
            }, 50);
        }(self));
    }

    var Events = {
        onScroll: function(scrollableList, event){
            _render(scrollableList);
        }
    };

    //public
    $.extend(ScrollableList.prototype, {
        _maxEntriesDrawn: 0,
        _data: [],
        start: function(){
            _monitorEvents(this);
        },

        stop: function(){

        },

        config: function(){

        }
    });

    //external
    Array.prototype.binarySearch = function(find, comparator) {
        var low = 0, high = this.length - 1,
            i, comparison;

        while (low <= high) {
            i = Math.floor((low + high) / 2);
            comparison = comparator(this[i], find);
            if (comparison < 0) { low = i + 1; continue; }
            if (comparison > 0) { high = i - 1; continue; }
            return i;
        }
        return null;
    };

    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    }
})(jQuery);