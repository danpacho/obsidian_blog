import React from 'react'

import { tw } from '../tools/tw.js'

import { type TailwindComponent } from './tailwind.component.js'

const header = tw.style({
    fontFamily: 'font-mono',
    fontSize: 'text-lg',
    fontWeight: 'font-semibold',
    color: 'text-stone-300',
})
const Header = (props: React.PropsWithChildren<TailwindComponent>) => {
    const className = props.tw
        ? tw.mergeProps(header.style(), props.tw)
        : header.class()
    return <p className={className}>{props.children}</p>
}
const subHeader = tw.style({
    fontFamily: 'font-mono',
    fontSize: 'text-base',
    fontWeight: 'font-semibold',
    color: 'text-stone-300',
})
const SubHeader = (props: React.PropsWithChildren<TailwindComponent>) => {
    const className = props.tw
        ? tw.mergeProps(subHeader.style(), props.tw)
        : subHeader.class()
    return <p className={className}>{props.children}</p>
}
const description = tw.style({
    fontFamily: 'font-sans',
    fontSize: 'text-sm',
    fontWeight: 'font-normal',
    color: 'text-stone-400',
})
const Description = (props: React.PropsWithChildren<TailwindComponent>) => {
    const className = props.tw
        ? tw.mergeProps(description.style(), props.tw)
        : description.class()
    return <p className={className}>{props.children}</p>
}
const paragraph = tw.style({
    fontFamily: 'font-sans',
    fontSize: 'text-base',
    fontWeight: 'font-normal',
    color: 'text-stone-300',
})
const Paragraph = (props: React.PropsWithChildren<TailwindComponent>) => {
    const className = props.tw
        ? tw.mergeProps(paragraph.style(), props.tw)
        : paragraph.class()
    return <p className={className}>{props.children}</p>
}
const code = tw.style({
    fontFamily: 'font-mono',
    fontSize: 'text-sm/5',
    fontWeight: 'font-normal',
    color: 'text-stone-300',
})
const Code = (props: React.PropsWithChildren<TailwindComponent>) => {
    const className = props.tw
        ? tw.mergeProps(code.style(), props.tw)
        : code.class()
    return <pre className={className}>{props.children}</pre>
}

export const Text = {
    Header,
    SubHeader,
    Description,
    Paragraph,
    Code,
}
