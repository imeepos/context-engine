/**
 * 类型定义补充：node-winautomation
 * 为 ESM 导入提供完整的类型支持
 */

import type {
  Automation as AutomationClass,
  AutomationElement,
  AutomationCondition,
  PatternIds as PatternIdsEnum,
  PropertyIds as PropertyIdsEnum,
  TreeScopes as TreeScopesEnum,
  ControlTypeIds as ControlTypeIdsEnum,
  EventIds as EventIdsEnum,
  ElementModes as ElementModesEnum,
  OrientationTypes as OrientationTypesEnum,
  ToggleStates as ToggleStatesEnum,
  ExpandCollapseStates as ExpandCollapseStatesEnum,
  WindowVisualStates as WindowVisualStatesEnum,
  WindowInteractionStates as WindowInteractionStatesEnum,
  ScrollAmounts as ScrollAmountsEnum,
  ZoomUnits as ZoomUnitsEnum,
  DockPositions as DockPositionsEnum,
  RowOrColumnMajor as RowOrColumnMajorEnum,
  SupportedTextSelections as SupportedTextSelectionsEnum,
  StyleIds as StyleIdsEnum,
  AnnotationTypeIds as AnnotationTypeIdsEnum,
  SynchronizedInputTypes as SynchronizedInputTypesEnum,
  TextUnits as TextUnitsEnum,
  TextPatternRangeEndpoints as TextPatternRangeEndpointsEnum,
  AttributeIds as AttributeIdsEnum,
  IInvokePattern,
  IValuePattern,
  ITogglePattern
} from 'node-winautomation'

/**
 * UIAutomation 命名空间类型定义
 */
export interface UIAutomationNamespace {
  Automation: typeof AutomationClass
  PropertyIds: typeof PropertyIdsEnum
  ControlTypeIds: typeof ControlTypeIdsEnum
  PatternIds: typeof PatternIdsEnum
  TreeScopes: typeof TreeScopesEnum
  EventIds: typeof EventIdsEnum
  ToggleStates: typeof ToggleStatesEnum
  WindowVisualStates: typeof WindowVisualStatesEnum
  WindowInteractionStates: typeof WindowInteractionStatesEnum
  DockPositions: typeof DockPositionsEnum
  ExpandCollapseStates: typeof ExpandCollapseStatesEnum
  ScrollAmounts: typeof ScrollAmountsEnum
  OrientationTypes: typeof OrientationTypesEnum
}

/**
 * node-winautomation 模块导出类型
 */
export interface NodeWinAutomationModule {
  UIAutomation: UIAutomationNamespace
  Automation: typeof AutomationClass
  PatternIds: typeof PatternIdsEnum
  PropertyIds: typeof PropertyIdsEnum
  TreeScopes: typeof TreeScopesEnum
  ControlTypeIds: typeof ControlTypeIdsEnum
  EventIds: typeof EventIdsEnum
  ElementModes: typeof ElementModesEnum
  OrientationTypes: typeof OrientationTypesEnum
  ToggleStates: typeof ToggleStatesEnum
  ExpandCollapseStates: typeof ExpandCollapseStatesEnum
  WindowVisualStates: typeof WindowVisualStatesEnum
  WindowInteractionStates: typeof WindowInteractionStatesEnum
  ScrollAmounts: typeof ScrollAmountsEnum
  ZoomUnits: typeof ZoomUnitsEnum
  DockPositions: typeof DockPositionsEnum
  RowOrColumnMajor: typeof RowOrColumnMajorEnum
  SupportedTextSelections: typeof SupportedTextSelectionsEnum
  StyleIds: typeof StyleIdsEnum
  AnnotationTypeIds: typeof AnnotationTypeIdsEnum
  SynchronizedInputTypes: typeof SynchronizedInputTypesEnum
  TextUnits: typeof TextUnitsEnum
  TextPatternRangeEndpoints: typeof TextPatternRangeEndpointsEnum
  AttributeIds: typeof AttributeIdsEnum
}

export type {
  AutomationClass,
  AutomationElement,
  AutomationCondition,
  IInvokePattern,
  IValuePattern,
  ITogglePattern
}
