import { ArgandWidget, type ArgandConfig } from './Argand'
import { AlignmentWidget, SegmentWidget } from './Geometry'
import { IPowersWidget } from './IPowers'
import { OperationsWidget, type OperationsConfig } from './Operations'
import { QuadraticWidget } from './Quadratic'
import { TransformWidget } from './Transform'
import { UnitCircleWidget, type UnitCircleConfig } from './UnitCircle'
import type { WidgetSpec } from '../lib/types'

export type { WidgetSpec }

export function WidgetHost({ widget }: { widget: WidgetSpec }) {
  switch (widget.name) {
    case 'argand': return <ArgandWidget config={widget as ArgandConfig} />
    case 'operations': return <OperationsWidget config={widget as OperationsConfig} />
    case 'unit-circle': return <UnitCircleWidget config={widget as UnitCircleConfig} />
    case 'quadratic': return <QuadraticWidget />
    case 'transform': return <TransformWidget config={widget as { mode?: 'translation' | 'homothety' | 'rotation' }} />
    case 'segment': return <SegmentWidget />
    case 'alignment': return <AlignmentWidget />
    case 'i-powers': return <IPowersWidget />
    default: return null // unknown widget names are ignored so new content never breaks older clients
  }
}
