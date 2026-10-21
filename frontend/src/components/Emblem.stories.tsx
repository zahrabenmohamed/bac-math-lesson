import type { Meta, StoryObj } from '@storybook/react-vite'
import { Emblem } from './Emblem'

const meta = {
  title: 'Composants/Emblem',
  component: Emblem,
  args: { label: 'L01', earned: true, size: 64 },
} satisfies Meta<typeof Emblem>

export default meta
type Story = StoryObj<typeof meta>

export const Earned: Story = {}
export const Locked: Story = { args: { earned: false } }
export const Boss: Story = { args: { label: 'B', earned: true } }

export const AllShapes: Story = {
  render: () => (
    <div className="flex gap-4">
      {['L01', 'L02', 'L03'].map((l) => <Emblem key={l} label={l} earned size={64} />)}
      {['L04', 'L05', 'L06'].map((l) => <Emblem key={l} label={l} earned={false} size={64} />)}
    </div>
  ),
}
