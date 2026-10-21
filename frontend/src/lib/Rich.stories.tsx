import type { Meta, StoryObj } from '@storybook/react-vite'
import { Rich } from './Rich'

const meta = {
  title: 'Composants/Rich',
  component: Rich,
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof Rich>

export default meta
type Story = StoryObj<typeof meta>

export const Explanation: Story = {
  args: {
    text: 'Tout nombre complexe $z$ s’écrit de façon unique $z = a + bi$ avec $a$ et $b$ réels.\n\n- $a$ est la **partie réelle** : $\\operatorname{Re}(z) = a$ ;\n- $b$ est la **partie imaginaire** : $\\operatorname{Im}(z) = b$.\n\n$$z \\times z\' = (ac - bd) + (ad + bc)\\,i$$',
  },
}

export const InvalidTex: Story = { args: { text: 'Une formule cassée n’interrompt pas la page : $\\frac{1}{$' } }
