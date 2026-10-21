import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { PlotInput } from '../components/exercises/PlotInput'
import { ArgandWidget } from './Argand'
import { AlignmentWidget, SegmentWidget } from './Geometry'
import { IPowersWidget } from './IPowers'
import { OperationsWidget } from './Operations'
import { QuadraticWidget } from './Quadratic'
import { TransformWidget } from './Transform'
import { UnitCircleWidget } from './UnitCircle'

const meta = {
  title: 'Activités interactives',
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div className="max-w-4xl"><Story /></div>],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const PlanComplexe: Story = {
  render: () => <ArgandWidget config={{ z: { re: 2, im: 1 }, conjugate: true, opposite: true }} />,
  play: async ({ canvasElement }) => {
    const point = within(canvasElement).getByTestId('point-z')
    point.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(point).toHaveAccessibleName(/partie réelle 2.5/)
  },
}

export const Module: Story = { render: () => <ArgandWidget config={{ z: { re: 3, im: 4 }, modulus: true }} /> }
export const Argument: Story = { render: () => <ArgandWidget config={{ z: { re: 1, im: 1 }, modulus: true, polar: true }} /> }
export const SommeEtInegaliteTriangulaire: Story = { render: () => <OperationsWidget config={{ op: 'add' }} /> }
export const ProduitModulesEtArguments: Story = { render: () => <OperationsWidget config={{ op: 'multiply' }} /> }
export const NotationExponentielle: Story = { render: () => <UnitCircleWidget config={{ mode: 'euler' }} /> }
export const FormuleDeMoivre: Story = { render: () => <UnitCircleWidget config={{ mode: 'moivre' }} /> }
export const EquationDuSecondDegre: Story = { render: () => <QuadraticWidget /> }
export const Transformations: Story = { render: () => <TransformWidget config={{ mode: 'rotation' }} /> }
export const VecteurMilieuDistance: Story = { render: () => <SegmentWidget /> }
export const AlignementEtOrthogonalite: Story = { render: () => <AlignmentWidget /> }
export const PuissancesDeI: Story = { render: () => <IPowersWidget /> }

export const ExercicePlacerUnPoint: Story = {
  render: () => <div className="max-w-md"><PlotInput range={5} locked={false} onChange={fn()} /></div>,
}
