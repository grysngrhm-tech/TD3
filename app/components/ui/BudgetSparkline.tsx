'use client'

import { ResponsiveLine } from '@nivo/line'
import { useMemo } from 'react'

type SparklineDataPoint = {
  date: string
  amount: number
}

type BudgetSparklineProps = {
  data: SparklineDataPoint[]
  budgetAmount: number
  width?: number
  height?: number
  showTooltip?: boolean
}

/**
 * Tiny sparkline chart showing spend trend over time
 * Red line if over budget, accent/green if healthy
 */
export function BudgetSparkline({ 
  data, 
  budgetAmount, 
  width = 80, 
  height = 24,
  showTooltip = true
}: BudgetSparklineProps) {
  // Calculate cumulative amounts and prepare data for Nivo
  const chartData = useMemo(() => {
    if (data.length === 0) return null

    // Sort by date
    const sorted = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate cumulative totals
    let cumulative = 0
    const points = sorted.map(point => {
      cumulative += point.amount
      return {
        x: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        y: cumulative,
      }
    })

    // Determine if over budget
    const isOverBudget = cumulative > budgetAmount

    return {
      data: [{
        id: 'spend',
        data: points,
      }],
      isOverBudget,
      totalSpent: cumulative,
    }
  }, [data, budgetAmount])

  if (!chartData || chartData.data[0].data.length < 2) {
    // Not enough data for a sparkline
    return (
      <div 
        className="flex items-center justify-center text-xs"
        style={{ width, height, color: 'var(--text-muted)' }}
      >
        —
      </div>
    )
  }

  const lineColor = chartData.isOverBudget ? 'var(--error)' : 'var(--accent)'

  return (
    <div style={{ width, height }}>
      <ResponsiveLine
        data={chartData.data}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        xScale={{ type: 'point' }}
        yScale={{ 
          type: 'linear', 
          min: 0, 
          max: Math.max(budgetAmount, chartData.totalSpent) * 1.1 
        }}
        curve="monotoneX"
        enableArea={true}
        areaOpacity={0.15}
        enableGridX={false}
        enableGridY={false}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={null}
        enablePoints={false}
        colors={[lineColor]}
        lineWidth={2}
        isInteractive={showTooltip}
        enableCrosshair={false}
        useMesh={showTooltip}
        tooltip={({ point }) => (
          <div
            style={{
              background: 'var(--bg-card)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--elevation-2)',
            }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {point.data.xFormatted}
            </div>
            <div className="text-xs font-bold" style={{ color: lineColor }}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
              }).format(point.data.y as number)}
            </div>
          </div>
        )}
        theme={{
          background: 'transparent',
          axis: {
            ticks: {
              text: { fill: 'var(--text-muted)' }
            }
          },
          crosshair: {
            line: {
              stroke: 'var(--border)',
              strokeWidth: 1,
            }
          }
        }}
        // Add budget threshold line
        markers={budgetAmount > 0 ? [
          {
            axis: 'y',
            value: budgetAmount,
            lineStyle: { 
              stroke: 'var(--text-muted)', 
              strokeWidth: 1, 
              strokeDasharray: '3 3' 
            },
          }
        ] : []}
      />
    </div>
  )
}

/**
 * Simplified sparkline for use in tight spaces
 * CSS-based animation with gradients
 */
export function MiniSparkline({ 
  percentUsed, 
  isOverBudget 
}: { 
  percentUsed: number
  isOverBudget: boolean 
}) {
  return (
    <div 
      className="relative h-1 w-16 rounded-full overflow-hidden"
      style={{ background: 'var(--bg-hover)' }}
    >
      <div 
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ 
          width: `${Math.min(percentUsed, 100)}%`,
          background: isOverBudget ? 'var(--error)' : 'var(--accent)',
        }}
      />
      {isOverBudget && (
        <div 
          className="absolute inset-y-0 rounded-full"
          style={{ 
            left: '100%',
            width: `${Math.min(percentUsed - 100, 50)}%`,
            background: 'var(--error)',
            opacity: 0.5,
          }}
        />
      )}
    </div>
  )
}

