# shadcn/ui Components Usage Guide

This guide shows how to use the installed shadcn/ui components in your Next.js application.

## Installed Components

The following shadcn/ui components have been installed and configured:

- **Button** - Various button styles and sizes
- **Card** - Content containers with header, content, and footer
- **Input** - Form input fields
- **Textarea** - Multi-line text input
- **Select** - Dropdown selection component
- **Progress** - Progress indicator bars

## Theme Configuration

The components have been configured to work with your existing indigo/purple gradient theme:

- Primary colors: Indigo (#6366f1)
- Secondary colors: Purple (#8b5cf6)
- Accent colors: Cyan (#06b6d4)
- Radius: 0.75rem (slightly more rounded)

## Usage Examples

### Button Component

```jsx
import { Button } from "@/components/ui/button";

// Different variants
<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🎵</Button>
```

### Card Component

```jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

### Input Component

```jsx
import { Input } from "@/components/ui/input";

<Input type="text" placeholder="Enter your text..." />
<Input type="email" placeholder="your.email@example.com" />
```

### Textarea Component

```jsx
import { Textarea } from "@/components/ui/textarea";

<Textarea placeholder="Enter your message..." rows={4} />
```

### Select Component

```jsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Progress Component

```jsx
import { Progress } from "@/components/ui/progress";

<Progress value={65} className="w-full" />
```

## Configuration Files

### components.json
Contains the shadcn/ui configuration including:
- Style: "new-york"
- TypeScript: false (using JavaScript)
- Component paths and aliases
- Icon library: lucide-react

### CSS Variables
The following CSS variables are configured in `src/app/globals.css`:

```css
:root {
  --primary: 238 65% 60%; /* indigo-500 */
  --secondary: 262 50% 70%; /* purple-400 */
  --accent: 195 100% 42%; /* cyan-500 */
  --radius: 0.75rem;
  /* ... other variables */
}
```

### Dark Mode Support
Dark mode colors are also configured and will automatically work when you implement dark mode in your application.

## File Structure

```
src/
├── components/
│   └── ui/
│       ├── button.jsx
│       ├── card.jsx
│       ├── input.jsx
│       ├── textarea.jsx
│       ├── select.jsx
│       └── progress.jsx
└── lib/
    └── utils.js (contains the cn utility function)
```

## Tips

1. **Utility Function**: Use the `cn()` function from `@/lib/utils` to combine Tailwind classes with component styles.

2. **Customization**: You can customize components by passing additional className props.

3. **Icons**: The components use Lucide React for icons. Install additional icons as needed:
   ```bash
   npm install lucide-react
   ```

4. **Accessibility**: All components follow accessibility best practices and include proper ARIA attributes.

5. **Responsive**: Components are responsive by default and work well across different screen sizes.

## Next Steps

You can now start using these components throughout your application. They will automatically inherit your indigo/purple theme and provide a consistent, professional UI experience.