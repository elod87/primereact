import React, { memo, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { DomHandler, ObjectUtils, classNames, ZIndexUtils } from '../utils/Utils';
import PrimeReact, { localeOption } from '../api/Api';
import { OverlayService } from '../overlayservice/OverlayService';
import { Tree } from '../tree/Tree';
import { TreeSelectPanel } from './TreeSelectPanel';
import { Ripple } from '../ripple/Ripple';
import { useEventListener, useOverlayScrollListener, useResizeListener } from '../hooks/Hooks';

export const TreeSelect = memo((props) => {
    const [focused, setFocused] = useState(false);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState({});
    const [filterValue, setFilterValue] = useState('');
    const elementRef = useRef(null);
    const overlayRef = useRef(null);
    const filterInputRef = useRef(null);
    const focusInputRef = useRef(null);
    const triggerRef = useRef(null);
    const selfChange = useRef(null);
    const filteredValue = props.onFilterValueChange ? props.filterValue : filterValue;
    const isValueEmpty = !props.value || Object.keys(props.value).length === 0;
    const hasNoOptions = !props.options || props.options.length === 0;

    const [bindDocumentClick, unbindDocumentClick] = useEventListener({ type: 'click', listener: event => {
        if (overlayVisible && isOutsideClicked(event)) {
            hide();
        }
    }});
    const [bindOverlayScroll, unbindOverlayScroll] = useOverlayScrollListener({ target: elementRef.current, listener: () => {
        overlayVisible && hide();
    }});
    const [bindWindowResize, unbindWindowResize] = useResizeListener({ listener: () => {
        if (overlayVisible && !DomHandler.isTouchDevice()) {
            hide();
        }
    }});

    const getSelectedNodes = () => {
        let selectedNodes = [];
        if (ObjectUtils.isNotEmpty(props.value) && props.options) {
            let keys = props.selectionMode === 'single' ? { [`${props.value}`]: true } : { ...props.value };
            findSelectedNodes(null, keys, selectedNodes);
        }

        return selectedNodes;
    }

    const getLabel = () => {
        let value = getSelectedNodes();
        return value.length ? value.map(node => node.label).join(', ') : props.placeholder;
    }

    const show = () => {
        setOverlayVisible(true);
    }

    const hide = () => {
        setOverlayVisible(false);
    }

    const onInputFocus = () => {
        setFocused(true);
    }

    const onInputBlur = () => {
        setFocused(false);
    }

    const onClick = (event) => {
        if (!props.disabled && (!overlayRef.current || !overlayRef.current.contains(event.target)) && !DomHandler.hasClass(event.target, 'p-treeselect-close')) {
            focusInputRef.current.focus();
            overlayVisible ? hide() : show();
        }
    }

    const onSelectionChange = (event) => {
        if (props.onChange) {
            selfChange.current = true;

            props.onChange({
                originalEvent: event.originalEvent,
                value: event.value,
                stopPropagation: () => { },
                preventDefault: () => { },
                target: {
                    name: props.name,
                    id: props.id,
                    value: event.value
                }
            });
        }
    }

    const onNodeSelect = (node) => {
        props.onNodeSelect && props.onNodeSelect(node);

        if (props.selectionMode === 'single') {
            hide();
        }
    }

    const onNodeUnselect = (node) => {
        props.onNodeUnselect && props.onNodeUnselect(node);
    }

    const onNodeToggle = (e) => {
        setExpandedKeys(e.value);
    }

    const onFilterValueChange = (e) => {
        setFilterValue(e.value);
    }

    const onOverlayClick = (event) => {
        OverlayService.emit('overlay-click', {
            originalEvent: event,
            target: elementRef.current
        });
    }

    const onInputKeyDown = (event) => {
        switch (event.which) {
            //down
            case 40:
                if (!overlayVisible && event.altKey) {
                    show();
                }
                break;

            //space
            case 32:
                if (!overlayVisible) {
                    show();
                    event.preventDefault();
                }
                break;

            //enter and escape
            case 13:
            case 27:
                if (overlayVisible) {
                    hide();
                    event.preventDefault();
                }
                break;

            //tab
            case 9:
                hide();
                break;

            default:
                break;
        }
    }

    const onFilterInputKeyDown = (event) => {
        //enter
        if (event.which === 13) {
            event.preventDefault();
        }
    }

    const onFilterInputChange = (event) => {
        let _filterValue = event.target.value;

        if (props.onFilterValueChange) {
            props.onFilterValueChange({
                originalEvent: event,
                value: _filterValue
            });
        }
        else {
            setFilterValue(_filterValue);
        }
    }

    const resetFilter = () => {
        setFilterValue('');
    }

    const onOverlayEnter = () => {
        ZIndexUtils.set('overlay', overlayRef.current, PrimeReact.autoZIndex, PrimeReact.zIndex['overlay']);
        alignOverlay();
        scrollInView();
    }

    const onOverlayEntered = () => {
        bindDocumentClick();
        bindOverlayScroll();
        bindWindowResize();

        if (props.filter && props.filterInputAutoFocus) {
            filterInputRef.current.focus();
        }

        props.onShow && props.onShow();
    }

    const onOverlayExit = () => {
        unbindDocumentClick();
        unbindOverlayScroll();
        unbindWindowResize();
    }

    const onOverlayExited = () => {
        if (props.filter && props.resetFilterOnHide) {
            resetFilter();
        }

        ZIndexUtils.clear(overlayRef.current);

        props.onHide && props.onHide();
    }

    const alignOverlay = () => {
        DomHandler.alignOverlay(overlayRef.current, triggerRef.current.parentElement, props.appendTo || PrimeReact.appendTo);
    }

    const scrollInView = () => {
        let highlightItem = DomHandler.findSingle(overlayRef.current, '.p-treenode-content.p-highlight');
        if (highlightItem && highlightItem.scrollIntoView) {
            highlightItem.scrollIntoView({ block: 'nearest', inline: 'start' });
        }
    }

    const isOutsideClicked = (event) => {
        return elementRef.current && !(elementRef.current.isSameNode(event.target) || elementRef.current.contains(event.target)
            || (overlayRef.current && overlayRef.current.contains(event.target)));
    }

    const findSelectedNodes = (node, keys, selectedNodes) => {
        if (node) {
            if (isSelected(node, keys)) {
                selectedNodes.push(node);
                delete keys[node.key];
            }

            if (Object.keys(keys).length && node.children) {
                for (let childNode of node.children) {
                    findSelectedNodes(childNode, keys, selectedNodes);
                }
            }
        }
        else {
            for (let childNode of props.options) {
                findSelectedNodes(childNode, keys, selectedNodes);
            }
        }
    }

    const isSelected = (node, keys) => {
        return props.selectionMode === 'checkbox' ? keys[node.key] && keys[node.key].checked : keys[node.key];
    }

    const updateTreeState = () => {
        let keys = props.selectionMode === 'single' ? { [`${props.value}`]: true } : { ...props.value };

        setExpandedKeys({});
        if (keys && props.options) {
            updateTreeBranchState(null, null, keys);
        }
    }

    const updateTreeBranchState = (node, path, keys) => {
        if (node) {
            if (isSelected(node, keys)) {
                expandPath(path);
                delete keys[node.key];
            }

            if (Object.keys(keys).length && node.children) {
                for (let childNode of node.children) {
                    path.push(node.key);
                    updateTreeBranchState(childNode, path, keys);
                }
            }
        }
        else {
            for (let childNode of props.options) {
                updateTreeBranchState(childNode, [], keys);
            }
        }
    }

    const expandPath = (path) => {
        if (path.length > 0) {
            let _expandedKeys = { ...(expandedKeys || {}) };
            for (let key of path) {
                _expandedKeys[key] = true;
            }

            setExpandedKeys(_expandedKeys);
        }
    }

    useEffect(() => {
        updateTreeState();

        return () => ZIndexUtils.clear(overlayRef.current);
    }, [props.options]);

    useEffect(() => {
        if (overlayVisible && props.filter) {
            alignOverlay();
        }
    }, [overlayVisible, props.filter]);

    useEffect(() => {
        if (overlayVisible && expandedKeys) {
            alignOverlay();
        }
    }, [expandedKeys]);

    useEffect(() => {
        if (overlayVisible) {
            if (!selfChange.current) {
                updateTreeState();
            }
            scrollInView();

            selfChange.current = false;
        }
    }, [props.value]);

    const useKeyboardHelper = () => {
        return (
            <div className="p-hidden-accessible">
                <input ref={focusInputRef} role="listbox" id={props.inputId} type="text" readOnly aria-haspopup="true" aria-expanded={overlayVisible}
                    onFocus={onInputFocus} onBlur={onInputBlur} onKeyDown={onInputKeyDown}
                    disabled={props.disabled} tabIndex={props.tabIndex} aria-label={props.ariaLabel} aria-labelledby={props.ariaLabelledBy} />
            </div>
        )
    }

    const useLabel = (selectedNodes) => {
        const labelClassName = classNames('p-treeselect-label', {
            'p-placeholder': getLabel() === props.placeholder,
            'p-treeselect-label-empty': !props.placeholder && isValueEmpty
        });

        let content = null;

        if (props.valueTemplate) {
            content = ObjectUtils.getJSXElement(props.valueTemplate, selectedNodes, props);
        }
        else {
            if (props.display === 'comma') {
                content = getLabel() || 'empty';
            }
            else if (props.display === 'chip') {
                const selectedNodes = getSelectedNodes();

                content = (
                    <>
                        {
                            selectedNodes && selectedNodes.map((node, index) => {
                                return (
                                    <div className="p-treeselect-token" key={`${node.key}_${index}`}>
                                        <span className="p-treeselect-token-label">{node.label}</span>
                                    </div>
                                )
                            })
                        }

                        {isValueEmpty && (props.placeholder || 'empty')}
                    </>
                )
            }
        }

        return (
            <div className="p-treeselect-label-container">
                <div className={labelClassName}>
                    {content}
                </div>
            </div>
        )
    }

    const useDropdownIcon = () => {
        let iconClassName = classNames('p-treeselect-trigger-icon p-clickable', props.dropdownIcon);

        return (
            <div ref={triggerRef} className="p-treeselect-trigger" role="button" aria-haspopup="listbox" aria-expanded={overlayVisible}>
                <span className={iconClassName}></span>
            </div>
        )
    }

    const useContent = () => {
        return (
            <>
                <Tree value={props.options} selectionMode={props.selectionMode} selectionKeys={props.value} metaKeySelection={props.metaKeySelection}
                    onSelectionChange={onSelectionChange} onSelect={onNodeSelect} onUnselect={onNodeUnselect}
                    expandedKeys={expandedKeys} onToggle={onNodeToggle}
                    onExpand={props.onNodeExpand} onCollapse={props.onNodeCollapse}
                    filter={props.filter} filterValue={filterValue} filterBy={props.filterBy} filterMode={props.filterMode}
                    filterPlaceholder={props.filterPlaceholder} filterLocale={props.filterLocale} showHeader={false} onFilterValueChange={onFilterValueChange}>
                </Tree>

                {
                    hasNoOptions && (
                        <div className="p-treeselect-empty-message">
                            {props.emptyMessage || localeOption('emptyMessage')}
                        </div>
                    )
                }
            </>
        )
    }

    const useFilterElement = () => {
        if (props.filter) {
            let _filterValue = ObjectUtils.isNotEmpty(filteredValue) ? filteredValue : '';

            return (
                <div className="p-treeselect-filter-container">
                    <input ref={filterInputRef} type="text" value={_filterValue} autoComplete="off" className="p-treeselect-filter p-inputtext p-component" placeholder={props.filterPlaceholder}
                        onKeyDown={onFilterInputKeyDown} onChange={onFilterInputChange} disabled={props.disabled} />
                    <span className="p-treeselect-filter-icon pi pi-search"></span>
                </div>
            )
        }

        return null;
    }

    const useHeader = () => {
        const filterElement = useFilterElement();
        const closeElement = (
            <button type="button" className="p-treeselect-close p-link" onClick={hide}>
                <span className="p-treeselect-close-icon pi pi-times"></span>
                <Ripple />
            </button>
        );
        const content = (
            <div className="p-treeselect-header">
                {filterElement}
                {closeElement}
            </div>
        );

        if (props.panelHeaderTemplate) {
            const defaultOptions = {
                className: 'p-treeselect-header',
                filterElement,
                closeElement,
                closeElementClassName: 'p-treeselect-close p-link',
                closeIconClassName: 'p-treeselect-close-icon pi pi-times',
                onCloseClick: hide,
                element: content,
                props: props
            }

            return ObjectUtils.getJSXElement(props.panelHeaderTemplate, defaultOptions);
        }

        return content;
    }

    const className = classNames('p-treeselect p-component p-inputwrapper', {
        'p-treeselect-chip': props.display === 'chip',
        'p-disabled': props.disabled,
        'p-focus': focused,
        'p-inputwrapper-filled': !isValueEmpty,
        'p-inputwrapper-focus': focused || overlayVisible
    }, props.className);

    const selectedNodes = getSelectedNodes();

    const keyboardHelper = useKeyboardHelper();
    const labelElement = useLabel(selectedNodes);
    const dropdownIcon = useDropdownIcon();
    const content = useContent();
    const header = useHeader();
    const footer = ObjectUtils.getJSXElement(props.footer, props);

    return (
        <div id={props.id} ref={elementRef} className={className} style={props.style} onClick={onClick}>
            {keyboardHelper}
            {labelElement}
            {dropdownIcon}
            <TreeSelectPanel ref={overlayRef} appendTo={props.appendTo} panelStyle={props.panelStyle} panelClassName={props.panelClassName}
                scrollHeight={props.scrollHeight} onClick={onOverlayClick} header={header} footer={footer} transitionOptions={props.transitionOptions}
                in={overlayVisible} onEnter={onOverlayEnter} onEntered={onOverlayEntered} onExit={onOverlayExit} onExited={onOverlayExited}>
                {content}
            </TreeSelectPanel>
        </div>
    )
})

TreeSelect.defaultProps = {
    __TYPE: 'TreeSelect',
    id: null,
    value: null,
    name: null,
    style: null,
    className: null,
    disabled: false,
    options: null,
    scrollHeight: '400px',
    placeholder: null,
    tabIndex: null,
    inputId: null,
    ariaLabel: null,
    ariaLabelledBy: null,
    selectionMode: 'single',
    panelStyle: null,
    panelClassName: null,
    appendTo: null,
    emptyMessage: null,
    display: 'comma',
    metaKeySelection: true,
    valueTemplate: null,
    panelHeaderTemplate: null,
    panelFooterTemplate: null,
    transitionOptions: null,
    dropdownIcon: 'pi pi-chevron-down',
    filter: false,
    filterValue: null,
    filterBy: 'label',
    filterMode: 'lenient',
    filterPlaceholder: null,
    filterLocale: undefined,
    filterInputAutoFocus: true,
    resetFilterOnHide: false,
    onShow: null,
    onHide: null,
    onChange: null,
    onNodeSelect: null,
    onNodeUnselect: null,
    onNodeExpand: null,
    onNodeCollapse: null,
    onFilterValueChange: null
}

TreeSelect.propTypes = {
    __TYPE: PropTypes.string,
    id: PropTypes.string,
    value: PropTypes.any,
    name: PropTypes.string,
    style: PropTypes.object,
    classNames: PropTypes.string,
    disabled: PropTypes.bool,
    options: PropTypes.any,
    scrollHeight: PropTypes.string,
    placeholder: PropTypes.string,
    tabIndex: PropTypes.number,
    inputId: PropTypes.string,
    ariaLabel: PropTypes.string,
    ariaLabelledBy: PropTypes.string,
    selectionMode: PropTypes.string,
    panelStyle: PropTypes.bool,
    panelClassName: PropTypes.string,
    appendTo: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    emptyMessage: PropTypes.string,
    display: PropTypes.string,
    metaKeySelection: PropTypes.bool,
    valueTemplate: PropTypes.any,
    panelHeaderTemplate: PropTypes.any,
    panelFooterTemplate: PropTypes.any,
    transitionOptions: PropTypes.object,
    dropdownIcon: PropTypes.string,
    filter: PropTypes.bool,
    filterValue: PropTypes.string,
    filterBy: PropTypes.any,
    filterMode: PropTypes.string,
    filterPlaceholder: PropTypes.string,
    filterLocale: PropTypes.string,
    filterInputAutoFocus: PropTypes.bool,
    resetFilterOnHide: PropTypes.bool,
    onShow: PropTypes.func,
    onHide: PropTypes.func,
    onChange: PropTypes.func,
    onNodeSelect: PropTypes.func,
    onNodeUnselect: PropTypes.func,
    onNodeExpand: PropTypes.func,
    onNodeCollapse: PropTypes.func,
    onFilterValueChange: PropTypes.func
}
