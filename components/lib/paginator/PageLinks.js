import React from 'react';
import PropTypes from 'prop-types';
import { ObjectUtils, classNames } from '../utils/Utils';
import { Ripple } from '../ripple/Ripple';

export const PageLinks = (props) => {

    const onPageLinkClick = (event, pageLink) => {
        if (props.onClick) {
            props.onClick({
                originalEvent: event,
                value: pageLink
            });
        }

        event.preventDefault();
    }

    let elements;

    if (props.value) {
        let startPageInView = props.value[0];
        let endPageInView = props.value[props.value.length - 1];

        elements = props.value.map((pageLink, i) => {
            const className = classNames('p-paginator-page p-paginator-element p-link', {
                'p-paginator-page-start': pageLink === startPageInView,
                'p-paginator-page-end': pageLink === endPageInView,
                'p-highlight': ((pageLink - 1) === props.page)
            });

            let element = (
                <button type="button" className={className} onClick={(e) => onPageLinkClick(e, pageLink)}>
                    {pageLink}
                    <Ripple />
                </button>
            );

            if (props.template) {
                const defaultOptions = {
                    onClick: (e) => onPageLinkClick(e, pageLink),
                    className,
                    view: {
                        startPage: startPageInView - 1,
                        endPage: endPageInView - 1
                    },
                    page: (pageLink - 1),
                    currentPage: props.page,
                    totalPages: props.pageCount,
                    element,
                    props: props
                };

                element = ObjectUtils.getJSXElement(props.template, defaultOptions);
            }

            return (
                <React.Fragment key={pageLink}>
                    {element}
                </React.Fragment>
            )
        });
    }

    return <span className="p-paginator-pages">{elements}</span>;
}

PageLinks.defaultProps = {
    __TYPE: 'PageLinks',
    value: null,
    page: null,
    rows: null,
    pageCount: null,
    links: null,
    template: null
}

PageLinks.propTypes = {
    __TYPE: PropTypes.string,
    value: PropTypes.array,
    page: PropTypes.number,
    rows: PropTypes.number,
    pageCount: PropTypes.number,
    onClick: PropTypes.func,
    template: PropTypes.any
}
