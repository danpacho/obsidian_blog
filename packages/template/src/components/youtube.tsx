import React, { useEffect, useRef, useState } from 'react'

const useIframeLoadState = () => {
    const [isLoaded, setIsLoaded] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        const iframe = iframeRef.current

        const onIframeLoad = () => {
            setIsLoaded(true)
        }

        if (iframe) {
            iframe.addEventListener('load', onIframeLoad)
        }

        return () => {
            if (iframe) {
                iframe.removeEventListener('load', onIframeLoad)
            }
        }
    }, [])

    return { isLoaded, iframeRef }
}

// const d = createTools<Tailwindest>()

// d.style({})

const getEmbeddedVideoId = (url: string) => {
    const urlObject = new URL(url)
    const urlParams = urlObject.searchParams
    const videoId = urlParams.get('v')
    if (!videoId) {
        throw new Error('Invalid YouTube URL')
    }

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&loop=1&modestbranding=1&showinfo=0&color=white&fs=0`
}

export const Youtube = ({
    videoId,
    width = 500,
    height = 100,
}: {
    videoId: string
    width?: number
    height?: number
}) => {
    const { iframeRef, isLoaded } = useIframeLoadState()
    const [isPlayerActive, setIsPlayerActive] = useState(false)
    useEffect(() => {
        if (!isLoaded) return

        // const mouseEvent = new MouseEvent
    }, [isLoaded])

    return (
        <section
            id="yt_player"
            className={
                'fixed bottom-7 left-1/2 -translate-x-1/2 transform-gpu *:z-50 *:overflow-hidden *:rounded-3xl *:border-2 *:shadow-2xl *:transition-all *:duration-500 *:ease-in-out'
            }
            onPointerEnter={() => {
                setIsPlayerActive(true)
            }}
            onPointerLeave={() => {
                setIsPlayerActive(false)
            }}
        >
            <div
                style={{ width: `${width}px`, height: `${height}px` }}
                className={`relative flex flex-col items-start bg-black p-3 *:animate-pulse ${isLoaded ? 'hidden' : 'block'} ${isPlayerActive ? 'translate-y-0 scale-110 border-red-600' : 'translate-y-20 scale-75 border-transparent'}`}
            >
                <div className="flex w-full flex-row items-center justify-between gap-5">
                    <div className="min-h-10 min-w-10 rounded-full bg-neutral-700"></div>
                    <div className="h-5 w-4/5 rounded bg-neutral-700"></div>
                    <div className="size-5 rounded bg-neutral-700"></div>
                </div>
                <div className="absolute left-1/2 top-1/2 flex h-[50px] w-fit -translate-x-1/2 -translate-y-1/2 flex-row items-center justify-center gap-2">
                    <div className="h-4 w-2 rounded bg-red-400 delay-0"></div>
                    <div className="h-4 w-2 rounded bg-red-500 delay-75"></div>
                    <div className="h-4 w-2 rounded bg-red-600 delay-100"></div>
                </div>
            </div>
            <iframe
                ref={iframeRef}
                src={getEmbeddedVideoId(videoId)}
                width={width}
                height={height}
                title="YouTube video player"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen={false}
                className={`${isLoaded ? 'block' : 'hidden'} ${isPlayerActive ? 'translate-y-0 scale-110 border-red-600' : 'translate-y-20 scale-75 border-transparent'}`}
            ></iframe>
        </section>
    )
}
