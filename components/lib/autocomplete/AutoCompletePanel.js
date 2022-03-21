import React, { forwardRef, memo } from 'react';
import { ObjectUtils, classNames } from '../utils/Utils';
import { CSSTransition } from '../csstransition/CSSTransition';
import { Ripple } from '../ripple/Ripple';
import { Portal } from '../portal/Portal';
import { VirtualScroller } from '../virtualscroller/VirtualScroller';

export const AutoCompletePanel = memo(forwardRef((props, ref) => {

    const getOptionGroupRenderKey = (optionGroup) => {
        return ObjectUtils.resolveFieldData(optionGroup, props.optionGroupLabel);
    }

    const useGroupChildren = (optionGroup, i) => {
        const groupChildren = props.getOptionGroupChildren(optionGroup);
        return (
            groupChildren.map((item, j) => {
                const key = i + '_' + j;
                const selected = props.selectedItem === item;
                const content = props.itemTemplate ? ObjectUtils.getJSXElement(props.itemTemplate, item, j) : props.field ? ObjectUtils.resolveFieldData(item, props.field) : item;

                return (
                    <li key={key} role="option" aria-selected={selected} className="p-autocomplete-item" onClick={(e) => props.onItemClick(e, item)} data-group={i} data-index={j}>
                        {content}
                        <Ripple />
                    </li>
                )
            })
        )
    }

    const useItem = (suggestion, index) => {
        if (props.optionGroupLabel) {
            const content = props.optionGroupTemplate ? ObjectUtils.getJSXElement(props.optionGroupTemplate, suggestion, index) : props.getOptionGroupLabel(suggestion);
            const childrenContent = useGroupChildren(suggestion, index);
            const key = index + '_' + getOptionGroupRenderKey(suggestion);

            return (
                <React.Fragment key={key}>
                    <li className="p-autocomplete-item-group">
                        {content}
                    </li>
                    {childrenContent}
                </React.Fragment>
            )
        }
        else {
            const content = props.itemTemplate ? ObjectUtils.getJSXElement(props.itemTemplate, suggestion, index) : props.field ? ObjectUtils.resolveFieldData(suggestion, props.field) : suggestion;

            return (
                <li key={index} role="option" aria-selected={props.selectedItem === suggestion} className="p-autocomplete-item" onClick={(e) => props.onItemClick(e, suggestion)}>
                    {content}
                    <Ripple />
                </li>
            )
        }
    }

    const useItems = () => {
        return props.suggestions ? props.suggestions.map(useItem) : null;
    }

    const useContent = () => {
        if (props.virtualScrollerOptions) {
            const virtualScrollerProps = { ...props.virtualScrollerOptions, ...{
                style: { ...props.virtualScrollerOptions.style, ...{ height: props.scrollHeight }},
                items: props.suggestions,
                itemTemplate: (item, options) => item && useItem(item, options.index),
                contentTemplate: (options) => {
                    const className = classNames('p-autocomplete-items', options.className);

                    return (
                        <ul ref={options.contentRef} className={className} role="listbox" id={props.listId}>
                            {options.children}
                        </ul>
                    )
                }
            }};

            return <VirtualScroller ref={props.virtualScrollerRef} {...virtualScrollerProps} />;
        }
        else {
            const items = useItems();

            return (
                <ul className="p-autocomplete-items" role="listbox" id={props.listId}>
                    {items}
                </ul>
            )
        }
    }

    const useElement = () => {
        const className = classNames('p-autocomplete-panel p-component', props.panelClassName);
        const style = { maxHeight: props.scrollHeight, ...(props.panelStyle || {}) };
        const content = useContent();

        return (
            <CSSTransition nodeRef={ref} classNames="p-connected-overlay" in={props.in} timeout={{ enter: 120, exit: 100 }} options={props.transitionOptions}
                unmountOnExit onEnter={props.onEnter} onEntering={props.onEntering} onEntered={props.onEntered} onExit={props.onExit} onExited={props.onExited}>
                <div ref={ref} className={className} style={style} onClick={props.onClick}>
                    {content}
                </div>
            </CSSTransition>
        )
    }

    const element = useElement();

    return <Portal element={element} appendTo={props.appendTo} />;
}))
