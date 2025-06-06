'use client'

import { useEffect, useState, useRef } from 'react'
import { flushSync } from 'react-dom'

// --- UI Primitives ---
import { Button } from '@/components/tiptap-ui-primitive/button'

// --- Icons ---
import { MoonStarIcon } from '@/components/tiptap-icons/moon-star-icon'
import { SunIcon } from '@/components/tiptap-icons/sun-icon'

export function ThemeToggle() {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme')

        if (storedTheme) {
            // Use stored preference
            const isDark = storedTheme === 'dark'
            setIsDarkMode(isDark)
        } else {
            // Fall back to system preference or meta tag
            const initialDarkMode =
                !!document.querySelector(
                    'meta[name="color-scheme"][content="dark"]'
                ) || window.matchMedia('(prefers-color-scheme: dark)').matches
            setIsDarkMode(initialDarkMode)
            // Save initial preference to localStorage
            localStorage.setItem('theme', initialDarkMode ? 'dark' : 'light')
        }
    }, [])

    // Listen to system preference changes only if no stored preference exists
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = () => {
            // Only update if no stored preference exists
            if (!localStorage.getItem('theme')) {
                setIsDarkMode(mediaQuery.matches)
            }
        }
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    // Apply theme to document
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode)
    }, [isDarkMode])

    const toggleDarkMode = async () => {
        const newIsDarkMode = !isDarkMode

        /**
         * Return early if View Transition API is not supported
         * or user prefers reduced motion
         */
        if (
            !buttonRef.current ||
            !document.startViewTransition ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            setIsDarkMode(newIsDarkMode)
            // Save preference to localStorage
            localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light')
            return
        }

        await document.startViewTransition(() => {
            flushSync(() => {
                setIsDarkMode(newIsDarkMode)
                // Save preference to localStorage
                localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light')
            })
        }).ready

        const { top, left, width, height } =
            buttonRef.current.getBoundingClientRect()
        const x = left + width / 2
        const y = top + height / 2
        const right = window.innerWidth - left
        const bottom = window.innerHeight - top
        const maxRadius = Math.hypot(
            Math.max(left, right),
            Math.max(top, bottom)
        )

        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration: 500,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)',
            }
        )
    }

    return (
        <Button
            ref={buttonRef}
            onClick={toggleDarkMode}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            data-style="ghost"
        >
            {isDarkMode ? (
                <MoonStarIcon className="tiptap-button-icon" />
            ) : (
                <SunIcon className="tiptap-button-icon" />
            )}
        </Button>
    )
}
