'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import icon from '~/app/icons/icon.png'

interface SafeCitiesProps {
    size?: number
    alt?: string
}

export function SafeCities({
    size = 18,
    alt = 'Safe Cities Logo',
}: SafeCitiesProps) {
    return <Image src={icon} width={size} height={size} alt={alt} />
}
