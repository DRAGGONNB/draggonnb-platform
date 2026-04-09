'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Circle, Ellipse, Text, Group, Line } from 'react-konva'
import type Konva from 'konva'
import type { TableWithSession, FloorPlan, TableShape } from '@/lib/restaurant/types'
import {
  SECTION_FILL,
  TABLE_STATUS_FILL,
  FLOOR_PLAN_GRID_SIZE,
} from '@/lib/restaurant/constants'

interface Props {
  tables: TableWithSession[]
  floorPlan: FloorPlan | null
  editMode: boolean
  selectedIds: string[]
  onSelect: (ids: string[]) => void
  onTableMove: (id: string, x: number, y: number) => void
  onTableResize: (id: string, width: number, height: number) => void
  onTableClick: (id: string) => void
}

function snapToGrid(val: number): number {
  return Math.round(val / FLOOR_PLAN_GRID_SIZE) * FLOOR_PLAN_GRID_SIZE
}

function getTableStatus(table: TableWithSession): string {
  if (!table.active_session) return 'available'
  if (table.active_session.status === 'bill_requested' || table.active_session.status === 'partially_paid') return 'pending_payment'
  return 'occupied'
}

function getTableFill(table: TableWithSession, isSelected: boolean): string {
  if (isSelected) return '#3B82F6' // blue-500
  if (table.linked_group_id) {
    const status = getTableStatus(table)
    if (status !== 'available') return TABLE_STATUS_FILL[status]
    return TABLE_STATUS_FILL.linked
  }
  return TABLE_STATUS_FILL[getTableStatus(table)]
}

function TableNode({
  table,
  isSelected,
  editMode,
  onSelect,
  onDragEnd,
  onClick,
}: {
  table: TableWithSession
  isSelected: boolean
  editMode: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onClick: () => void
}) {
  const fill = getTableFill(table, isSelected)
  const sectionColor = SECTION_FILL[table.section] || '#6B7280'
  const x = Number(table.x_pos) || 0
  const y = Number(table.y_pos) || 0
  const w = Number(table.width) || 80
  const h = Number(table.height) || 80
  const shape = (table.shape || 'rect') as TableShape

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    onDragEnd(snapToGrid(node.x()), snapToGrid(node.y()))
  }

  const sessionInfo = table.active_session
    ? `${table.active_session.party_size}p`
    : `${table.capacity}s`

  return (
    <Group
      x={x}
      y={y}
      draggable={editMode}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.cancelBubble = true
        if (editMode) onSelect()
        else onClick()
      }}
      onTap={(e) => {
        e.cancelBubble = true
        if (editMode) onSelect()
        else onClick()
      }}
      rotation={table.rotation || 0}
    >
      {/* Table shape */}
      {shape === 'circle' ? (
        <Circle
          x={w / 2}
          y={h / 2}
          radius={Math.min(w, h) / 2}
          fill={fill}
          stroke={isSelected ? '#1D4ED8' : sectionColor}
          strokeWidth={isSelected ? 3 : 2}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={editMode ? 8 : 4}
          shadowOffsetY={2}
          opacity={0.9}
        />
      ) : shape === 'oval' ? (
        <Ellipse
          x={w / 2}
          y={h / 2}
          radiusX={w / 2}
          radiusY={h / 2}
          fill={fill}
          stroke={isSelected ? '#1D4ED8' : sectionColor}
          strokeWidth={isSelected ? 3 : 2}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={editMode ? 8 : 4}
          shadowOffsetY={2}
          opacity={0.9}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          fill={fill}
          stroke={isSelected ? '#1D4ED8' : sectionColor}
          strokeWidth={isSelected ? 3 : 2}
          cornerRadius={8}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={editMode ? 8 : 4}
          shadowOffsetY={2}
          opacity={0.9}
        />
      )}

      {/* Label */}
      <Text
        text={table.label}
        x={0}
        y={h / 2 - 14}
        width={w}
        align="center"
        fontSize={14}
        fontStyle="bold"
        fill="white"
      />

      {/* Capacity / party info */}
      <Text
        text={sessionInfo}
        x={0}
        y={h / 2 + 2}
        width={w}
        align="center"
        fontSize={11}
        fill="rgba(255,255,255,0.8)"
      />
    </Group>
  )
}

export default function FloorPlanCanvas({
  tables,
  floorPlan,
  editMode,
  selectedIds,
  onSelect,
  onTableMove,
  onTableClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 })
  const [scale, setScale] = useState(1)

  // Responsive sizing
  useEffect(() => {
    function resize() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const canvasW = floorPlan?.canvas_width || 1200
      const canvasH = floorPlan?.canvas_height || 800
      const scaleX = rect.width / canvasW
      const scaleY = (rect.height || 600) / canvasH
      const s = Math.min(scaleX, scaleY, 1)
      setScale(s)
      setStageSize({ width: canvasW * s, height: canvasH * s })
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [floorPlan])

  // Multi-select with shift
  const handleSelect = useCallback(
    (id: string, e?: { evt?: { shiftKey?: boolean } }) => {
      if (e?.evt?.shiftKey) {
        onSelect(
          selectedIds.includes(id)
            ? selectedIds.filter((s) => s !== id)
            : [...selectedIds, id]
        )
      } else {
        onSelect(selectedIds.includes(id) && selectedIds.length === 1 ? [] : [id])
      }
    },
    [selectedIds, onSelect]
  )

  // Click on empty space deselects
  const handleStageClick = () => {
    if (editMode) onSelect([])
  }

  // Grid lines for edit mode
  const gridLines: { points: number[] }[] = []
  if (editMode) {
    const canvasW = floorPlan?.canvas_width || 1200
    const canvasH = floorPlan?.canvas_height || 800
    for (let i = 0; i <= canvasW; i += FLOOR_PLAN_GRID_SIZE) {
      gridLines.push({ points: [i, 0, i, canvasH] })
    }
    for (let i = 0; i <= canvasH; i += FLOOR_PLAN_GRID_SIZE) {
      gridLines.push({ points: [0, i, canvasW, i] })
    }
  }

  // Draw link lines between grouped tables
  const groupedTables = tables.filter((t) => t.linked_group_id)
  const groupMap = new Map<string, TableWithSession[]>()
  groupedTables.forEach((t) => {
    const group = groupMap.get(t.linked_group_id!) || []
    group.push(t)
    groupMap.set(t.linked_group_id!, group)
  })

  return (
    <div ref={containerRef} className="w-full bg-gray-900 rounded-xl overflow-hidden relative" style={{ minHeight: 500 }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Grid layer */}
        {editMode && (
          <Layer>
            {gridLines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            ))}
          </Layer>
        )}

        {/* Link lines layer */}
        <Layer>
          {Array.from(groupMap.values()).map((group, gi) =>
            group.slice(1).map((t, ti) => {
              const prev = group[ti]
              const x1 = Number(prev.x_pos) + Number(prev.width) / 2
              const y1 = Number(prev.y_pos) + Number(prev.height) / 2
              const x2 = Number(t.x_pos) + Number(t.width) / 2
              const y2 = Number(t.y_pos) + Number(t.height) / 2
              return (
                <Line
                  key={`link-${gi}-${ti}`}
                  points={[x1, y1, x2, y2]}
                  stroke="#6366F1"
                  strokeWidth={3}
                  dash={[8, 4]}
                  opacity={0.6}
                />
              )
            })
          )}
        </Layer>

        {/* Tables layer */}
        <Layer>
          {tables.map((table) => (
            <TableNode
              key={table.id}
              table={table}
              isSelected={selectedIds.includes(table.id)}
              editMode={editMode}
              onSelect={() => handleSelect(table.id)}
              onDragEnd={(x, y) => onTableMove(table.id, x, y)}
              onClick={() => onTableClick(table.id)}
            />
          ))}
        </Layer>
      </Stage>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-white/70">
        {[
          { label: 'Available', color: TABLE_STATUS_FILL.available },
          { label: 'Occupied', color: TABLE_STATUS_FILL.occupied },
          { label: 'Payment', color: TABLE_STATUS_FILL.pending_payment },
          { label: 'Linked', color: TABLE_STATUS_FILL.linked },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
