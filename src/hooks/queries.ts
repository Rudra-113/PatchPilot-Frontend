import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOverview, listActivity } from '@/services/overview'
import { generatePatch, getPatch, getPatchForVulnerability, listPatches, markPatchApplied, preparePullRequest, startValidation } from '@/services/patches'
import { createProject, getProject, listProjects } from '@/services/projects'
import { createReport, getReport, listReports } from '@/services/reports'
import { connectRepository, listRepositories, lookupRepository } from '@/services/repositories'
import { getScan, listScans, startScan } from '@/services/scans'
import { getSettings, updateSettings } from '@/services/settings'
import { getVulnerability, listVulnerabilities, updateVulnerability, workspaceMeta } from '@/services/vulnerabilities'
import type { ConnectRepositoryInput, CreateProjectInput, Settings, VulnerabilityQuery, VulnStatus } from '@/types/api'

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
    refetchInterval: (query) => (query.state.data?.runningScans ? 2000 : false),
  })
}

export function useActivity() {
  return useQuery({ queryKey: ['activity'], queryFn: listActivity })
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: listProjects })
}

export function useProject(projectId: string) {
  return useQuery({ queryKey: ['projects', projectId], queryFn: () => getProject(projectId), enabled: Boolean(projectId) })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useRepositories() {
  return useQuery({ queryKey: ['repositories'], queryFn: listRepositories })
}

export function useLookupRepository() {
  return useMutation({ mutationFn: lookupRepository })
}

export function useConnectRepository() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConnectRepositoryInput) => connectRepository(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useScans(projectId?: string) {
  return useQuery({
    queryKey: ['scans', projectId ?? 'all'],
    queryFn: () => listScans(projectId),
    refetchInterval: (query) => (query.state.data?.some((scan) => scan.status === 'running') ? 2000 : false),
  })
}

export function useScan(scanId: string) {
  return useQuery({
    queryKey: ['scans', 'detail', scanId],
    queryFn: () => getScan(scanId),
    enabled: Boolean(scanId),
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 700 : false),
  })
}

export function useStartScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => startScan(projectId),
    onSuccess: (scan) => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.setQueryData(['scans', 'detail', scan.id], scan)
    },
  })
}

export function useVulnerabilities(query: VulnerabilityQuery) {
  return useQuery({
    queryKey: ['vulnerabilities', query],
    queryFn: () => listVulnerabilities(query),
    placeholderData: keepPreviousData,
  })
}

export function useVulnerability(vulnerabilityId: string) {
  return useQuery({
    queryKey: ['vulnerabilities', vulnerabilityId],
    queryFn: () => getVulnerability(vulnerabilityId),
    enabled: Boolean(vulnerabilityId),
    retry: false,
  })
}

export function useUpdateVulnerability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VulnStatus }) => updateVulnerability(id, status),
    onSuccess: (vulnerability) => {
      queryClient.setQueryData(['vulnerabilities', vulnerability.id], vulnerability)
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: workspaceMeta, staleTime: 30_000 })
}

export function usePatches() {
  return useQuery({ queryKey: ['patches'], queryFn: () => listPatches() })
}

export function usePatch(patchId: string) {
  return useQuery({
    queryKey: ['patches', patchId],
    queryFn: () => getPatch(patchId),
    enabled: Boolean(patchId),
    refetchInterval: (query) => (query.state.data?.status === 'validating' ? 700 : false),
  })
}

export function useVulnerabilityPatch(vulnerabilityId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['patches', 'for', vulnerabilityId],
    queryFn: () => getPatchForVulnerability(vulnerabilityId),
    enabled,
    retry: false,
  })
}

export function useGeneratePatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vulnerabilityId: string) => generatePatch(vulnerabilityId),
    onSuccess: (patch) => {
      queryClient.setQueryData(['patches', patch.id], patch)
      queryClient.invalidateQueries({ queryKey: ['patches'] })
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

export function useStartValidation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patchId: string) => startValidation(patchId),
    onSuccess: (patch) => {
      queryClient.setQueryData(['patches', patch.id], patch)
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] })
    },
  })
}

export function usePreparePullRequest() {
  return useMutation({ mutationFn: (patchId: string) => preparePullRequest(patchId) })
}

export function useMarkApplied() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patchId: string) => markPatchApplied(patchId),
    onSuccess: (patch) => {
      queryClient.setQueryData(['patches', patch.id], patch)
      queryClient.invalidateQueries({ queryKey: ['patches'] })
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useReports() {
  return useQuery({ queryKey: ['reports'], queryFn: listReports })
}

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { title?: string; projectId?: string | null }) => createReport(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  })
}

export function useReportDownload() {
  return useMutation({ mutationFn: (reportId: string) => getReport(reportId) })
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: getSettings })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => updateSettings(patch),
    onSuccess: (settings) => queryClient.setQueryData(['settings'], settings),
  })
}
