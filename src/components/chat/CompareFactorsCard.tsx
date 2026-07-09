'use client'

import React, { useState, useCallback } from 'react'
import { Scale, Plus, X, Check } from 'lucide-react'
import { Button } from '@togo-framework/ui-core'
import { Checkbox } from '@togo-framework/ui-core'
import { Input } from '@togo-framework/ui-core'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@togo-framework/ui-core'
import type { ComparisonFactor, CompareFactorsData } from '../copilot/types'

// Re-export types for consumers
export type { ComparisonFactor, CompareFactorsData }

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompareFactorsCardProps {
  data: CompareFactorsData
  onAccept: (factors: ComparisonFactor[]) => void
  disabled?: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * CompareFactorsCard
 *
 * Renders an editable list of comparison factors. The user can enable/disable
 * factors, change their weight, add custom factors, and confirm the selection.
 *
 * All app deps removed — language is a plain prop.
 */
const CompareFactorsCard = ({
  data,
  onAccept,
  disabled = false,
  language = 'en',
}: CompareFactorsCardProps) => {
  const isAR = language === 'ar'
  const [factors, setFactors] = useState<ComparisonFactor[]>(data.factors)
  const [newFactorLabel, setNewFactorLabel] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)

  const toggleFactor = useCallback((id: string) => {
    if (disabled) return
    setFactors(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }, [disabled])

  const updateWeight = useCallback((id: string, weight: 'high' | 'medium' | 'low') => {
    if (disabled) return
    setFactors(prev => prev.map(f => f.id === id ? { ...f, weight } : f))
  }, [disabled])

  const removeFactor = useCallback((id: string) => {
    if (disabled) return
    setFactors(prev => prev.filter(f => f.id !== id))
  }, [disabled])

  const addCustomFactor = useCallback(() => {
    if (!newFactorLabel.trim() || disabled) return
    const id = `custom-${Date.now()}`
    setFactors(prev => [...prev, {
      id,
      label: newFactorLabel.trim(),
      description: 'Custom factor',
      weight: 'medium',
      enabled: true,
    }])
    setNewFactorLabel('')
    setShowAddInput(false)
  }, [newFactorLabel, disabled])

  const weightLabel = (w: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      high:   { en: 'High',   ar: 'عالي' },
      medium: { en: 'Medium', ar: 'متوسط' },
      low:    { en: 'Low',    ar: 'منخفض' },
    }
    return (labels[w]?.[isAR ? 'ar' : 'en']) || w
  }

  const enabledCount = factors.filter(f => f.enabled).length

  return (
    <div className={`mt-3 rounded-lg border border-border bg-card/80 overflow-hidden ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="px-3 py-2.5 bg-muted/50 border-b border-border flex items-center gap-2">
        <Scale className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {data.subjectA.title} <span className="text-muted-foreground font-normal">vs</span> {data.subjectB.title}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isAR ? `${enabledCount} عامل محدد` : `${enabledCount} factors selected`}
          </p>
        </div>
        {disabled && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
      </div>

      {/* Factor list */}
      <div className="divide-y divide-border/50">
        {factors.map(factor => (
          <div key={factor.id} className="px-3 py-2 flex items-center gap-2 hover:bg-muted/30 transition-colors duration-fast ease-standard">
            <Checkbox
              checked={factor.enabled}
              onCheckedChange={() => toggleFactor(factor.id)}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${factor.enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                {factor.label}
              </p>
              {factor.description && factor.description !== 'Custom factor' && (
                <p className="text-[10px] text-muted-foreground truncate">{factor.description}</p>
              )}
            </div>
            <Select
              value={factor.weight}
              onValueChange={(v) => updateWeight(factor.id, v as 'high' | 'medium' | 'low')}
            >
              <SelectTrigger className="h-6 w-[80px] text-[10px] border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high" className="text-xs">{weightLabel('high')}</SelectItem>
                <SelectItem value="medium" className="text-xs">{weightLabel('medium')}</SelectItem>
                <SelectItem value="low" className="text-xs">{weightLabel('low')}</SelectItem>
              </SelectContent>
            </Select>
            {factor.id.startsWith('custom-') && (
              <button
                onClick={() => removeFactor(factor.id)}
                className="text-muted-foreground hover:text-destructive transition-colors duration-fast ease-standard"
                aria-label={isAR ? 'إزالة' : 'Remove'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add custom factor */}
      <div className="px-3 py-2 border-t border-border/50">
        {showAddInput ? (
          <div className="flex items-center gap-2">
            <Input
              value={newFactorLabel}
              onChange={(e) => setNewFactorLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustomFactor()
                if (e.key === 'Escape') setShowAddInput(false)
              }}
              placeholder={isAR ? 'اسم العامل...' : 'Factor name...'}
              className="h-7 text-xs flex-1"
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={addCustomFactor}>
              <Check className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => { setShowAddInput(false); setNewFactorLabel('') }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
          >
            <Plus className="w-3 h-3" />
            {isAR ? 'إضافة عامل مخصص' : 'Add custom factor'}
          </button>
        )}
      </div>

      {/* Accept button */}
      {!disabled && (
        <div className="px-3 py-2.5 border-t border-border bg-muted/30">
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            onClick={() => onAccept(factors)}
            disabled={enabledCount === 0}
          >
            <Scale className="w-3.5 h-3.5" />
            {isAR ? 'قبول وتشغيل المقارنة' : 'Accept & Run Comparison'}
          </Button>
        </div>
      )}
    </div>
  )
}

CompareFactorsCard.displayName = 'CompareFactorsCard'

export default CompareFactorsCard