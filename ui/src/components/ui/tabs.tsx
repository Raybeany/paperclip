import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type TabPanels = { values: ReadonlySet<string>; register: (value: string) => () => void }

/** The panels that exist, so a tab never names a missing one. */
const TabPanelsContext = React.createContext<TabPanels | null>(null)

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [values, setValues] = React.useState<ReadonlySet<string>>(() => new Set())
  const register = React.useCallback((value: string) => {
    setValues((current) => new Set(current).add(value))
    return () => setValues((current) => {
      const next = new Set(current)
      next.delete(value)
      return next
    })
  }, [])
  const panels = React.useMemo(() => ({ values, register }), [values, register])

  return (
    <TabPanelsContext.Provider value={panels}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        className={cn(
          "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
          className
        )}
        {...props}
      />
    </TabPanelsContext.Provider>
  )
}

const tabsListVariants = cva(
  "p-(--sz-3px) group-data-[orientation=horizontal]/tabs:h-9 group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const panels = React.useContext(TabPanelsContext)
  const noPanel = panels && !panels.values.has(props.value) ? { "aria-controls": undefined } : null

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      {...noPanel}
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground hover:text-foreground relative inline-flex h-(--sz-calc-27) flex-1 items-center justify-center gap-1.5 border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-(--tp-color-background-color-border-color-box-shadow) group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-(length:--rad-3) focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 data-[state=active]:text-foreground",
        "after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-(--sz-neg-5px) group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const register = React.useContext(TabPanelsContext)?.register
  React.useLayoutEffect(() => register?.(props.value), [register, props.value])

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
