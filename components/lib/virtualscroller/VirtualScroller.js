import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ObjectUtils, classNames } from '../utils/Utils';
import { usePrevious } from '../hooks/Hooks';

export const VirtualScroller = forwardRef((props, ref) => {
    const isVertical = props.orientation === 'vertical';
    const isHorizontal = props.orientation === 'horizontal';
    const isBoth = props.orientation === 'both';

    const [first, setFirst] = useState(isBoth ? { rows: 0, cols: 0 } : 0);
    const [last, setLast] = useState(isBoth ? { rows: 0, cols: 0 } : 0);
    const [numItemsInViewport, setNumItemsInViewport] = useState(isBoth ? { rows: 0, cols: 0 } : 0);
    const [numToleratedItems, setNumToleratedItems] = useState(props.numToleratedItems);
    const [loading, setLoading] = useState(props.loading);
    const [loaderArr, setLoaderArr] = useState([]);
    const elementRef = useRef(null);
    const contentRef = useRef(null);
    const spacerRef = useRef(null);
    const stickyRef = useRef(null);
    const lastScrollPos = useRef(isBoth ? { top: 0, left: 0 } : 0);
    const scrollTimeout = useRef(null);
    const prevItems = usePrevious(props.items);
    const prevLoading = usePrevious(props.loading);

    const scrollTo = (options) => {
        elementRef.current && elementRef.current.scrollTo(options);
    }

    const scrollToIndex = (index, behavior = 'auto') => {
        const { numToleratedItems: _numItemsInViewport } = calculateNumItems();
        const itemSize = props.itemSize;
        const contentPos = getContentPosition();
        const calculateFirst = (_index = 0, _numT) => (_index <= _numT ? 0 : _index);
        const calculateCoord = (_first, _size, _cpos) => (_first * _size) + _cpos;
        const scrollTo = (left = 0, top = 0) => scrollTo({ left, top, behavior });

        if (isBoth) {
            const newFirst = { rows: calculateFirst(index[0], _numItemsInViewport[0]), cols: calculateFirst(index[1], _numItemsInViewport[1]) };
            if (newFirst.rows !== first.rows || newFirst.cols !== first.cols) {
                scrollTo(calculateCoord(newFirst.cols, itemSize[1], contentPos.left), calculateCoord(newFirst.rows, itemSize[0], contentPos.top))
                setFirst(newFirst);
            }
        }
        else {
            const newFirst = calculateFirst(index, _numItemsInViewport);

            if (newFirst !== first) {
                isHorizontal ? scrollTo(calculateCoord(newFirst, itemSize, contentPos.left), 0) : scrollTo(0, calculateCoord(newFirst, itemSize, contentPos.top));
                setFirst(newFirst);
            }
        }
    }

    const scrollInView = (index, to, behavior = 'auto') => {
        if (to) {
            const { first: _first, viewport } = getRenderedRange();
            const itemSize = props.itemSize;
            const scrollTo = (left = 0, top = 0) => scrollTo({ left, top, behavior });
            const isToStart = to === 'to-start';
            const isToEnd = to === 'to-end';

            if (isToStart) {
                if (isBoth) {
                    if (viewport.first.rows - _first.rows > index[0]) {
                        scrollTo(viewport.first.cols * itemSize, (viewport.first.rows - 1) * itemSize);
                    }
                    else if (viewport.first.cols - _first.cols > index[1]) {
                        scrollTo((viewport.first.cols - 1) * itemSize, viewport.first.rows * itemSize);
                    }
                }
                else {
                    if (viewport.first - _first > index) {
                        const pos = (viewport.first - 1) * itemSize;
                        isHorizontal ? scrollTo(pos, 0) : scrollTo(0, pos);
                    }
                }
            }
            else if (isToEnd) {
                if (isBoth) {
                    if (viewport.last.rows - _first.rows <= index[0] + 1) {
                        scrollTo(viewport.first.cols * itemSize, (viewport.first.rows + 1) * itemSize);
                    }
                    else if (viewport.last.cols - _first.cols <= index[1] + 1) {
                        scrollTo((viewport.first.cols + 1) * itemSize, viewport.first.rows * itemSize);
                    }
                }
                else {
                    if (viewport.last - _first <= index + 1) {
                        const pos = (viewport.first + 1) * itemSize;
                        isHorizontal ? scrollTo(pos, 0) : scrollTo(0, pos);
                    }
                }
            }
        }
        else {
            scrollToIndex(index, behavior);
        }
    }

    const getRows = () => {
        return loading ? (props.loaderDisabled ? loaderArr : []) : loadedItems();
    }

    const getColumns = () => {
        if (props.columns) {
            if (isBoth || isHorizontal) {
                return loading && props.loaderDisabled ?
                    (isBoth ? loaderArr[0] : loaderArr) :
                    props.columns.slice((isBoth ? first.cols : first), (isBoth ? last.cols : last));
            }
        }

        return props.columns;
    }

    const getRenderedRange = () => {
        const itemSize = props.itemSize;
        const calculateFirstInViewport = (_pos, _size) => Math.floor(_pos / (_size || _pos));

        let firstInViewport = first;
        let lastInViewport = 0;

        if (elementRef.current) {
            const scrollTop = elementRef.current.scrollTop;
            const scrollLeft = elementRef.current.scrollLeft;

            if (isBoth) {
                firstInViewport = { rows: calculateFirstInViewport(scrollTop, itemSize[0]), cols: calculateFirstInViewport(scrollLeft, itemSize[1]) };
                lastInViewport = { rows: firstInViewport.rows + numItemsInViewport.rows, cols: firstInViewport.cols + numItemsInViewport.cols };
            }
            else {
                const scrollPos = isHorizontal ? scrollLeft : scrollTop;
                firstInViewport = calculateFirstInViewport(scrollPos, itemSize);
                lastInViewport = firstInViewport + numItemsInViewport;
            }
        }

        return {
            first,
            last,
            viewport: {
                first: firstInViewport,
                last: lastInViewport
            }
        }
    }

    const calculateNumItems = () => {
        const itemSize = props.itemSize;
        const contentPos = getContentPosition();
        const contentWidth = elementRef.current ? elementRef.current.offsetWidth - contentPos.left : 0;
        const contentHeight = elementRef.current ? elementRef.current.offsetHeight - contentPos.top : 0;
        const calculateNumItemsInViewport = (_contentSize, _itemSize) => Math.ceil(_contentSize / (_itemSize || _contentSize));
        const calculateNumToleratedItems = (_numItems) => Math.ceil(_numItems / 2);
        const _numItemsInViewport = isBoth ?
            { rows: calculateNumItemsInViewport(contentHeight, itemSize[0]), cols: calculateNumItemsInViewport(contentWidth, itemSize[1]) } :
            calculateNumItemsInViewport((isHorizontal ? contentWidth : contentHeight), itemSize);

        const _numToleratedItems = numToleratedItems || (isBoth ?
            [calculateNumToleratedItems(_numItemsInViewport.rows), calculateNumToleratedItems(_numItemsInViewport.cols)] :
            calculateNumToleratedItems(_numItemsInViewport));

        return { numItemsInViewport: _numItemsInViewport, numToleratedItems: _numToleratedItems };
    }

    const calculateOptions = () => {
        const { numItemsInViewport: _numItemsInViewport, numToleratedItems: _numToleratedItems } = calculateNumItems();
        const calculateLast = (_first, _num, _numT, _isCols) => getLast(_first + _num + ((_first < _numT ? 2 : 3) * _numT), _isCols);
        const _last = isBoth ?
            { rows: calculateLast(first.rows, _numItemsInViewport.rows, _numToleratedItems[0]), cols: calculateLast(first.cols, _numItemsInViewport.cols, _numToleratedItems[1], true) } :
            calculateLast(first, _numItemsInViewport, _numToleratedItems);

        setNumItemsInViewport(_numItemsInViewport);
        setNumToleratedItems(_numToleratedItems);
        setLast(_last);

        if (props.showLoader) {
            setLoaderArr(isBoth ?
                Array.from({ length: _numItemsInViewport.rows }).map(() => Array.from({ length: _numItemsInViewport.cols })) :
                Array.from({ length: _numItemsInViewport }));
        }

        if (props.lazy) {
            props.onLazyLoad && props.onLazyLoad({ first, last: _last });
        }
    }

    const getLast = (_last = 0, isCols) => {
        if (props.items) {
            return Math.min((isCols ? (props.columns || props.items[0]).length : props.items.length), _last);
        }

        return 0;
    }

    const getContentPosition = () => {
        if (contentRef.current) {
            const style = getComputedStyle(contentRef.current);
            const left = parseInt(style.paddingLeft, 10) + Math.max(parseInt(style.left, 10), 0);
            const right = parseInt(style.paddingRight, 10) + Math.max(parseInt(style.right, 10), 0);
            const top = parseInt(style.paddingTop, 10) + Math.max(parseInt(style.top, 10), 0);
            const bottom = parseInt(style.paddingBottom, 10) + Math.max(parseInt(style.bottom, 10), 0);

            return { left, right, top, bottom, x: left + right, y: top + bottom };
        }

        return { left: 0, right: 0, top: 0, bottom: 0, x: 0, y: 0 };
    }

    const setSize = () => {
        if (elementRef.current) {
            const parentElement = elementRef.current.parentElement;
            const width = props.scrollWidth || `${(elementRef.current.offsetWidth || parentElement.offsetWidth)}px`;
            const height = props.scrollHeight || `${(elementRef.current.offsetHeight || parentElement.offsetHeight)}px`;
            const setProp = (_name, _value) => elementRef.current.style[_name] = _value;

            if (isBoth || isHorizontal) {
                setProp('height', height);
                setProp('width', width);
            }
            else {
                setProp('height', height);
            }
        }
    }

    const setSpacerSize = () => {
        const items = props.items;

        if (spacerRef.current && items) {
            const itemSize = props.itemSize;
            const contentPos = getContentPosition();
            const setProp = (_name, _value, _size, _cpos = 0) => spacerRef.current.style[_name] = (((_value || []).length * _size) + _cpos) + 'px';

            if (isBoth) {
                setProp('height', items, itemSize[0], contentPos.y);
                setProp('width', (props.columns || items[1]), itemSize[1], contentPos.x);
            }
            else {
                isHorizontal ? setProp('width', (props.columns || items), itemSize, contentPos.x) : setProp('height', items, itemSize, contentPos.y);
            }
        }
    }

    const setContentPosition = (pos) => {
        if (contentRef.current) {
            const firstPos = pos ? pos.first : first;
            const itemSize = props.itemSize;
            const calculateTranslateVal = (_first, _size) => (_first * _size);
            const setTransform = (_x = 0, _y = 0) => {
                stickyRef.current && (stickyRef.current.style.top = `-${_y}px`);
                contentRef.current.style.transform = `translate3d(${_x}px, ${_y}px, 0)`;
            };

            if (isBoth) {
                setTransform(calculateTranslateVal(firstPos.cols, itemSize[1]), calculateTranslateVal(firstPos.rows, itemSize[0]));
            }
            else {
                const translateVal = calculateTranslateVal(firstPos, itemSize);
                isHorizontal ? setTransform(translateVal, 0) : setTransform(0, translateVal);
            }
        }
    }

    const onScrollPositionChange = (event) => {
        const target = event.target;
        const itemSize = props.itemSize;
        const contentPos = getContentPosition();
        const calculateScrollPos = (_pos, _cpos) => _pos ? (_pos > _cpos ? _pos - _cpos : _pos) : 0;
        const calculateCurrentIndex = (_pos, _size) => Math.floor(_pos / (_size || _pos));
        const calculateTriggerIndex = (_currentIndex, _first, _last, _num, _numT, _isScrollDownOrRight) => {
            return (_currentIndex <= _numT ? _numT : (_isScrollDownOrRight ? (_last - _num - _numT) : (_first + _numT - 1)))
        };
        const calculateFirst = (_currentIndex, _triggerIndex, _first, _last, _num, _numT, _isScrollDownOrRight) => {
            if (_currentIndex <= _numT)
                return 0;
            else
                return Math.max(0, _isScrollDownOrRight ?
                    (_currentIndex < _triggerIndex ? _first : _currentIndex - _numT) :
                    (_currentIndex > _triggerIndex ? _first : _currentIndex - (2 * _numT)));
        };
        const calculateLast = (_currentIndex, _first, _last, _num, _numT, _isCols) => {
            let lastValue = _first + _num + (2 * _numT);

            if (_currentIndex >= _numT) {
                lastValue += (_numT + 1);
            }

            return getLast(lastValue, _isCols);
        };

        const scrollTop = calculateScrollPos(target.scrollTop, contentPos.top);
        const scrollLeft = calculateScrollPos(target.scrollLeft, contentPos.left);

        let newFirst = 0;
        let newLast = last;
        let isRangeChanged = false;

        if (isBoth) {
            const isScrollDown = lastScrollPos.current.top <= scrollTop;
            const isScrollRight = lastScrollPos.current.left <= scrollLeft;
            const currentIndex = { rows: calculateCurrentIndex(scrollTop, itemSize[0]), cols: calculateCurrentIndex(scrollLeft, itemSize[1]) };
            const triggerIndex = {
                rows: calculateTriggerIndex(currentIndex.rows, first.rows, last.rows, numItemsInViewport.rows, numToleratedItems[0], isScrollDown),
                cols: calculateTriggerIndex(currentIndex.cols, first.cols, last.cols, numItemsInViewport.cols, numToleratedItems[1], isScrollRight)
            };

            newFirst = {
                rows: calculateFirst(currentIndex.rows, triggerIndex.rows, first.rows, last.rows, numItemsInViewport.rows, numToleratedItems[0], isScrollDown),
                cols: calculateFirst(currentIndex.cols, triggerIndex.cols, first.cols, last.cols, numItemsInViewport.cols, numToleratedItems[1], isScrollRight)
            };
            newLast = {
                rows: calculateLast(currentIndex.rows, newFirst.rows, last.rows, numItemsInViewport.rows, numToleratedItems[0]),
                cols: calculateLast(currentIndex.cols, newFirst.cols, last.cols, numItemsInViewport.cols, numToleratedItems[1], true)
            };

            isRangeChanged = (newFirst.rows !== first.rows && newLast.rows !== last.rows) || (newFirst.cols !== first.cols && newLast.cols !== last.cols);

            lastScrollPos.current = { top: scrollTop, left: scrollLeft };
        }
        else {
            const scrollPos = isHorizontal ? scrollLeft : scrollTop;
            const isScrollDownOrRight = lastScrollPos.current <= scrollPos;
            const currentIndex = calculateCurrentIndex(scrollPos, itemSize);
            const triggerIndex = calculateTriggerIndex(currentIndex, first, last, numItemsInViewport, numToleratedItems, isScrollDownOrRight);

            newFirst = calculateFirst(currentIndex, triggerIndex, first, last, numItemsInViewport, numToleratedItems, isScrollDownOrRight);
            newLast = calculateLast(currentIndex, newFirst, last, numItemsInViewport, numToleratedItems);
            isRangeChanged = newFirst !== first && newLast !== last;

            lastScrollPos.current = scrollPos;
        }

        return {
            first: newFirst,
            last: newLast,
            isRangeChanged
        }
    }

    const onScrollChange = (event) => {
        const { first: _first, last: _last, isRangeChanged } = onScrollPositionChange(event);

        if (isRangeChanged) {
            const newState = { first: _first, last: _last };

            setContentPosition(newState);

            setFirst(_first);
            setLast(_last);

            props.onScrollIndexChange && props.onScrollIndexChange(newState);

            if (props.lazy) {
                props.onLazyLoad && props.onLazyLoad(newState);
            }
        }
    }

    const onScroll = (event) => {
        props.onScroll && props.onScroll(event);

        if (props.delay) {
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }

            if (!loading && props.showLoader) {
                const { isRangeChanged: changed } = onScrollPositionChange(event);
                changed && setLoading(true);
            }

            scrollTimeout.current = setTimeout(() => {
                onScrollChange(event);

                if (loading && props.showLoader && !props.lazy) {
                    setLoading(false);
                }
            }, props.delay);
        }
        else {
            onScrollChange(event);
        }
    }

    const getOptions = (renderedIndex) => {
        const count = (props.items || []).length;
        const index = isBoth ? first.rows + renderedIndex : first + renderedIndex;

        return {
            index,
            count,
            first: index === 0,
            last: index === (count - 1),
            even: index % 2 === 0,
            odd: index % 2 !== 0,
            props
        }
    }

    const loaderOptions = (index, extOptions) => {
        const count = loaderArr.length;

        return {
            index,
            count,
            first: index === 0,
            last: index === (count - 1),
            even: index % 2 === 0,
            odd: index % 2 !== 0,
            props,
            ...extOptions
        }
    }

    const loadedItems = () => {
        const items = props.items;

        if (items && !loading) {
            if (isBoth)
                return items.slice(first.rows, last.rows).map(item => props.columns ? item : item.slice(first.cols, last.cols));
            else if (isHorizontal && props.columns)
                return items;
            else
                return items.slice(first, last);
        }

        return [];
    }

    const init = () => {
        setSize();
        calculateOptions();
        setSpacerSize();
    }

    useEffect(() => {
        init();
    }, [props.itemSize, props.scrollHeight]);

    useEffect(() => {
        if ((!prevItems || prevItems.length !== (props.items || []).length)) {
            init();
        }
    }, [props.items]);

    useEffect(() => {
        if (props.lazy && prevLoading !== props.loading && props.loading !== loading) {
            setLoading(props.loading);
        }
    }, [props.lazy, props.loading]);

    useEffect(() => {
        lastScrollPos.current = isBoth ? { top: 0, left: 0 } : 0;
    }, [props.orientation]);

    useImperativeHandle(ref, () => ({
        scrollTo,
        scrollToIndex,
        scrollInView,
        getRenderedRange
    }));

    const useLoaderItem = (index, extOptions = {}) => {
        const options = loaderOptions(index, extOptions);
        const content = ObjectUtils.getJSXElement(props.loadingTemplate, options);

        return (
            <React.Fragment key={index}>
                {content}
            </React.Fragment>
        )
    }

    const useLoader = () => {
        if (!props.loaderDisabled && props.showLoader && loading) {
            const className = classNames('p-virtualscroller-loader', {
                'p-component-overlay': !props.loadingTemplate
            });

            let content = <i className="p-virtualscroller-loading-icon pi pi-spinner pi-spin"></i>;

            if (props.loadingTemplate) {
                content = loaderArr.map((_, index) => {
                    return useLoaderItem(index, isBoth && { numCols: numItemsInViewport.cols });
                })
            }

            return (
                <div className={className}>
                    {content}
                </div>
            )
        }

        return null;
    }

    const useSpacer = () => {
        if (props.showSpacer) {
            return (
                <div ref={spacerRef} className="p-virtualscroller-spacer"></div>
            )
        }

        return null;
    }

    const useItem = (item, index) => {
        const options = getOptions(index);
        const content = ObjectUtils.getJSXElement(props.itemTemplate, item, options);

        return (
            <React.Fragment key={options.index}>
                {content}
            </React.Fragment>
        )
    }

    const useItems = () => {
        const _loadedItems = loadedItems();

        return _loadedItems.map(useItem);
    }

    const useContent = () => {
        const items = useItems();
        const className = classNames('p-virtualscroller-content', { 'p-virtualscroller-loading': loading });
        const content = (
            <div className={className} ref={contentRef}>
                {items}
            </div>
        )

        if (props.contentTemplate) {
            const defaultOptions = {
                className,
                contentRef: (el) => contentRef.current = ObjectUtils.getRefElement(el),
                spacerRef: (el) => spacerRef.current = ObjectUtils.getRefElement(el),
                stickyRef: (el) => stickyRef.current = ObjectUtils.getRefElement(el),
                items: loadedItems,
                getItemOptions: (index) => getOptions(index),
                children: items,
                element: content,
                props: props,
                loading,
                getLoaderOptions: (index, ext) => loaderOptions(index, ext),
                loadingTemplate: props.loadingTemplate,
                itemSize: props.itemSize,
                rows: getRows(),
                columns: getColumns(),
                vertical: isVertical,
                horizontal: isHorizontal,
                both: isBoth
            }

            return ObjectUtils.getJSXElement(props.contentTemplate, defaultOptions);
        }

        return content;
    }

    if (props.disabled) {
        const content = ObjectUtils.getJSXElement(props.contentTemplate, { items: props.items, rows: props.items, columns: props.columns });

        return (
            <React.Fragment>
                {props.children}
                {content}
            </React.Fragment>
        )
    }
    else {
        const className = classNames('p-virtualscroller', {
            'p-both-scroll': isBoth,
            'p-horizontal-scroll': isHorizontal
        }, props.className);

        const loader = useLoader();
        const content = useContent();
        const spacer = useSpacer();

        return (
            <div ref={elementRef} className={className} tabIndex={0} style={props.style} onScroll={onScroll}>
                {content}
                {spacer}
                {loader}
            </div>
        )
    }
})

VirtualScroller.defaultProps = {
    __TYPE: 'VirtualScroller',
    id: null,
    style: null,
    className: null,
    items: null,
    itemSize: 0,
    scrollHeight: null,
    scrollWidth: null,
    orientation: 'vertical',
    numToleratedItems: null,
    delay: 0,
    lazy: false,
    disabled: false,
    loaderDisabled: false,
    columns: null,
    loading: false,
    showSpacer: true,
    showLoader: false,
    loadingTemplate: null,
    itemTemplate: null,
    contentTemplate: null,
    onScroll: null,
    onScrollIndexChange: null,
    onLazyLoad: null
}

VirtualScroller.propTypes = {
    __TYPE: PropTypes.string,
    id: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string,
    items: PropTypes.any,
    itemSize: PropTypes.oneOfType([PropTypes.number, PropTypes.array]).isRequired,
    scrollHeight: PropTypes.string,
    scrollWidth: PropTypes.string,
    orientation: PropTypes.string,
    numToleratedItems: PropTypes.number,
    delay: PropTypes.number,
    lazy: PropTypes.bool,
    disabled: PropTypes.bool,
    loaderDisabled: PropTypes.bool,
    columns: PropTypes.any,
    loading: PropTypes.bool,
    showSpacer: PropTypes.bool,
    showLoader: PropTypes.bool,
    loadingTemplate: PropTypes.any,
    itemTemplate: PropTypes.any,
    contentTemplate: PropTypes.any,
    onScroll: PropTypes.func,
    onScrollIndexChange: PropTypes.func,
    onLazyLoad: PropTypes.func
}
