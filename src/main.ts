import { defineAddon } from '@pulsesync/addon-sdk'
import config from '../addon.config.mjs'
import './style.css'

const ICONS = {
    mute: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>',
    low: '<svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>',
    high: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
}

const modalSelector = '[data-test-id="FULLSCREEN_PLAYER_MODAL"]'
const volumeSelectors = [
    'input[data-test-id="CHANGE_VOLUME_SLIDER"]',
    '[data-test-id="VOLUME_SLIDER"] input[type="range"]',
    'input[type="range"]:not(.fsv-input):is([aria-label*="Громкость" i], [aria-label*="Volume" i])',
]
const progressSelector = '[data-test-id="TIMECODE_SLIDER"], [data-test-id="CHANGE_TIME_SLIDER"], input[type="range"], [role="slider"]'
const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
const clamp = (volume: number) => Math.max(0, Math.min(1, volume))
const nativeInput = () => volumeSelectors.map(selector => document.querySelector<HTMLInputElement>(selector)).find(Boolean)
const volumeMax = (input: HTMLInputElement) => Math.max(1, Number(input.max) || 1)

function readVolume() {
    const input = nativeInput()
    if (input && Number.isFinite(input.valueAsNumber)) return clamp(input.valueAsNumber / volumeMax(input))
    const audio = document.querySelector('audio')
    return audio ? (audio.muted ? 0 : audio.volume) : 1
}

function setVolume(volume: number) {
    const input = nativeInput()
    if (input) {
        const max = volumeMax(input)
        setInputValue.call(input, String(max > 1 ? Math.round(volume * max) : volume))
        for (const type of ['input', 'change']) input.dispatchEvent(new Event(type, { bubbles: true }))
    }
    const audio = document.querySelector('audio')
    if (audio) {
        audio.volume = volume
        if (volume > 0) audio.muted = false
    }
}

export default defineAddon({
    id: config.id,
    name: config.name,
    start(api) {
        if (api.signal.aborted) return
        let mounted: { modal: Element; control: HTMLElement; dispose: () => void } | undefined
        let lastVolume = 0.5

        function mount(modal: Element) {
            const control = document.createElement('div')
            control.className = 'fsv-container'
            control.innerHTML = `
                <button type="button" class="fsv-mute-btn" aria-label="Выключить или включить звук"></button>
                <div class="fsv-slider-wrap">
                    <div class="fsv-track"><div class="fsv-fill"></div></div>
                    <input type="range" min="0" max="100" class="fsv-input" aria-label="Громкость">
                    <div class="fsv-percent"></div>
                </div>`
            const button = control.querySelector('button')!
            const input = control.querySelector('input')!
            const fill = control.querySelector<HTMLElement>('.fsv-fill')!
            const percent = control.querySelector<HTMLElement>('.fsv-percent')!
            const controller = new AbortController()
            const { signal } = controller
            let dragging = false
            let hideTimer = 0
            let frame = 0
            let bar: Element | undefined
            let position = ''
            let displayed = -1

            function render(volume: number) {
                const value = Math.round(volume * 100)
                if (value === displayed) return
                const icon = (n: number) => (n === 0 ? 'mute' : n < 50 ? 'low' : 'high')
                if (displayed === -1 || icon(value) !== icon(displayed)) button.innerHTML = ICONS[icon(value)]
                displayed = value
                input.value = String(value)
                fill.style.width = percent.style.left = percent.textContent = `${value}%`
            }

            function showPercent() {
                control.classList.add('is-adjusting')
                window.clearTimeout(hideTimer)
                if (!dragging) hideTimer = window.setTimeout(() => control.classList.remove('is-adjusting'), 350)
            }

            function apply(volume: number) {
                volume = clamp(volume)
                if (volume > 0) lastVolume = volume
                setVolume(volume)
                render(volume)
                showPercent()
            }

            function place() {
                if (!bar || !modal.contains(bar)) {
                    bar = Array.from(modal.querySelectorAll(progressSelector)).find(element => {
                        if (control.contains(element) || element.matches(volumeSelectors.join(','))) return false
                        const rect = element.getBoundingClientRect()
                        return rect.width > 80 && rect.height > 0 && rect.bottom > 0
                    })
                }
                const bounds = modal.getBoundingClientRect()
                const rect = bar?.getBoundingClientRect()
                const x = rect?.width ? rect.left - bounds.left + rect.width / 2 : bounds.width / 2
                const y = rect?.width ? rect.bottom - bounds.top + 22 : bounds.height * 0.89
                const next = `translate3d(${Math.round(x * 2) / 2}px, ${Math.round(y * 2) / 2}px, 0) translateX(-50%)`
                if (next !== position) control.style.setProperty('transform', (position = next), 'important')
                frame = requestAnimationFrame(place)
            }

            input.addEventListener(
                'pointerdown',
                () => {
                    dragging = true
                    showPercent()
                },
                { signal },
            )
            for (const type of ['pointerup', 'pointercancel']) {
                window.addEventListener(
                    type,
                    () => {
                        if (!dragging) return
                        dragging = false
                        showPercent()
                    },
                    { signal },
                )
            }
            input.addEventListener('input', () => apply(input.valueAsNumber / 100), { signal })
            control.addEventListener(
                'wheel',
                event => {
                    event.preventDefault()
                    apply(readVolume() + (event.deltaY < 0 ? 0.05 : -0.05))
                },
                { signal, passive: false },
            )
            button.addEventListener(
                'click',
                () => {
                    const volume = readVolume()
                    if (volume > 0) lastVolume = volume
                    apply(volume > 0 ? 0 : lastVolume)
                },
                { signal },
            )

            modal.append(control)
            render(readVolume())
            place()
            const sync = window.setInterval(() => {
                if (!dragging) render(readVolume())
            }, 500)

            return {
                modal,
                control,
                dispose() {
                    controller.abort()
                    clearTimeout(hideTimer)
                    clearInterval(sync)
                    cancelAnimationFrame(frame)
                    control.remove()
                },
            }
        }

        function update() {
            const modal = document.querySelector(modalSelector)
            if (mounted && mounted.modal === modal && mounted.control.parentElement === modal) return
            mounted?.dispose()
            mounted = modal ? mount(modal) : undefined
        }

        const observer = new MutationObserver(update)
        observer.observe(document, { childList: true, subtree: true })
        update()
        return () => {
            observer.disconnect()
            mounted?.dispose()
        }
    },
})
