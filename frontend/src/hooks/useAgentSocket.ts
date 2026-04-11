import { useState, useEffect, useRef, useCallback } from 'react'
import type { AgentEvent, FleetSnapshotEvent, VesselState } from '../types'

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export interface UseAgentSocketReturn {
  events:          AgentEvent[]
  vessels:         Record<string, VesselState>
  status:          SocketStatus
  isAgentRunning:  boolean
  systemStatus:    'ok' | 'fallback'
  lastAgentRunAt:  string | undefined
  clearEvents:     () => void
}

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'
const MAX_RETRIES = 5
const MAX_EVENTS  = 500

export function useAgentSocket(): UseAgentSocketReturn {
  const [events,         setEvents]         = useState<AgentEvent[]>([])
  const [vessels,        setVessels]        = useState<Record<string, VesselState>>({})
  const [status,         setStatus]         = useState<SocketStatus>('connecting')
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [systemStatus,   setSystemStatus]   = useState<'ok' | 'fallback'>('ok')
  const [lastAgentRunAt, setLastAgentRunAt] = useState<string | undefined>(undefined)

  const wsRef          = useRef<WebSocket | null>(null)
  const retriesRef     = useRef(0)
  const retryTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus(retriesRef.current > 0 ? 'reconnecting' : 'connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      retriesRef.current = 0
      setStatus('connected')
    }

    ws.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as AgentEvent

        // Track agent running state + fallback detection
        if (event.type === 'system') {
          if (event.status === 'agent_start') {
            setIsAgentRunning(true)
          }
          if (event.status === 'agent_end') {
            setIsAgentRunning(false)
            setLastAgentRunAt(event.timestamp)
          }
          if (event.status === 'fallback_activated') {
            setIsAgentRunning(false)
            setSystemStatus('fallback')
            setLastAgentRunAt(event.timestamp)
          }
        }

        // Heartbeat: sync system_status
        if (event.type === 'heartbeat') {
          if (event.system_status === 'fallback') setSystemStatus('fallback')
          else                                    setSystemStatus('ok')
        }

        // Fleet snapshot: update map positions, do NOT push to log panel
        if (event.type === 'fleet_snapshot') {
          const snap = event as FleetSnapshotEvent
          setVessels(
            Object.fromEntries(
              snap.vessels.map(v => [
                v.shipment_id,
                {
                  shipment_id:  v.shipment_id,
                  vessel_name:  v.vessel_name,
                  position:     v.position,
                  next_port:    v.next_port,
                  current_port: v.current_port,
                  cargo_type:   v.cargo_type,
                  risk_level:   v.risk_level as VesselState['risk_level'],
                  eta_original: '',
                },
              ])
            )
          )
          return  // don't add to event log
        }

        // Observation events also update vessel risk level on the map
        if (event.type === 'observation') {
          setVessels(prev => {
            const existing = prev[event.shipment_id]
            if (!existing) return prev
            return {
              ...prev,
              [event.shipment_id]: {
                ...existing,
                risk_level: event.severity === 'critical' ? 'critical'
                  : event.severity === 'warning' ? 'warning' : 'nominal',
              },
            }
          })
        }

        setEvents(prev => {
          const next = [...prev, event]
          return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
        })
      } catch {
        // malformed message — ignore
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      wsRef.current = null
      if (retriesRef.current < MAX_RETRIES) {
        const delay = Math.min(1000 * 2 ** retriesRef.current, 16000)
        retriesRef.current++
        setStatus('reconnecting')
        retryTimerRef.current = setTimeout(connect, delay)
      }
    }

    ws.onerror = () => { ws.close() }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      retryTimerRef.current && clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, vessels, status, isAgentRunning, systemStatus, lastAgentRunAt, clearEvents }
}
