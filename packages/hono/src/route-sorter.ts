export function compareRoutePriority(pathA: string, pathB: string): number {
  const segmentsA = pathA.split('/').filter(Boolean);
  const segmentsB = pathB.split('/').filter(Boolean);

  const paramsA = segmentsA.filter((segment) => segment.startsWith(':')).length;
  const paramsB = segmentsB.filter((segment) => segment.startsWith(':')).length;
  if (paramsA !== paramsB) {
    return paramsA - paramsB;
  }

  if (segmentsA.length !== segmentsB.length) {
    return segmentsB.length - segmentsA.length;
  }

  return pathB.length - pathA.length;
}

export function sortRoutesByPriority<T extends { fullPath: string }>(routes: T[]): T[] {
  return [...routes].sort((a, b) => compareRoutePriority(a.fullPath, b.fullPath));
}
