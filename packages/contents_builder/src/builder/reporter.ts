import type { UUID } from 'crypto'
import type { FTreeNode, NodeType } from '../parser/node'
import type { Promisify, Stateful } from '../utils/promisify'
import type { FileBuilderConstructor } from './builder'

export interface BuildReport {
    name: string
    path: {
        origin: string
        build: string
    }
    type: NodeType
    buildID: UUID
    createdAt: string
    state: 'CACHED' | 'ADDED' | 'UPDATED'
}
export type BuildReportSet = Array<BuildReport>

//TODO: report path setter
interface BuildReporterConstructor extends FileBuilderConstructor {}
export class BuildReporter {
    public constructor(public readonly option: BuildReporterConstructor) {}

    public readonly totalReport: BuildReportSet = []
    public get cachedReport(): BuildReportSet {
        return this.totalReport.filter((report) => report.state === 'CACHED')
    }
    public get updatedReport(): BuildReportSet {
        return this.totalReport.filter((report) => report.state === 'UPDATED')
    }
    public get addedReport(): BuildReportSet {
        return this.totalReport.filter((report) => report.state === 'ADDED')
    }

    public get reportUUID(): Set<UUID> {
        return new Set(this.totalReport.map((report) => report.buildID))
    }

    public get reportJSON(): string {
        return JSON.stringify(this.totalReport, null, 4)
    }

    public get reportPath(): string {
        const REPORT_FILE_NAME = 'build_report.json' as const
        return `${this.option.buildPath.assets}/${REPORT_FILE_NAME}`
    }

    public addReport(
        node: FTreeNode,
        { buildID, buildPath }: { buildID: UUID; buildPath: string }
    ): Stateful<BuildReport> {
        const zenDate = new Date().toISOString()
        const report: BuildReport = {
            buildID,
            name: node.fileName,
            path: {
                origin: node.absolutePath,
                build: buildPath,
            },
            type: node.category,
            createdAt: zenDate,
            state: 'ADDED',
        }

        const shouldUpdate = this.updateReport(node, {
            buildID,
            buildPath,
            state: 'UPDATED',
        })
        if (shouldUpdate.success) {
            return {
                success: true,
                data: shouldUpdate.data,
            }
        }

        this.totalReport.push(report)

        return {
            success: true,
            data: report,
        }
    }

    public updateReport(
        node: FTreeNode,
        {
            buildID,
            buildPath,
            state,
        }: { buildID: UUID; buildPath: string; state: BuildReport['state'] }
    ): Stateful<BuildReport> {
        const targetReport = this.totalReport.find(
            (report) => report.path.origin === node.absolutePath
        )
        if (!targetReport) {
            return {
                success: false,
                error: 'Report not found',
            }
        }

        targetReport.buildID = buildID
        targetReport.path.build = buildPath
        targetReport.createdAt = new Date().toISOString()
        targetReport.state = state

        return {
            success: true,
            data: targetReport,
        }
    }

    public removeReport(removeAbsPath: string): Stateful<BuildReport> {
        const targetReport = this.totalReport.find(
            (report) => report.path.origin === removeAbsPath
        )
        if (!targetReport) {
            return {
                success: false,
                error: 'Report not found',
            }
        }

        const index = this.totalReport.indexOf(targetReport)
        this.totalReport.splice(index, 1)

        return {
            success: true,
            data: targetReport,
        }
    }

    public async writeReport(): Promisify<BuildReportSet> {
        const reportWrite = await this.option.ioManager.writer.write({
            filePath: this.reportPath,
            data: this.reportJSON,
        })

        if (!reportWrite.success) {
            return {
                success: false,
                error: reportWrite.error,
            }
        }

        return {
            success: true,
            data: this.totalReport,
        }
    }

    public async loadReport(): Promisify<BuildReportSet> {
        const reportLoad = await this.option.ioManager.reader.readFile(
            this.reportPath
        )

        if (!reportLoad.success) {
            return {
                success: false,
                error: reportLoad.error,
            }
        }

        const loadedBuildReport = JSON.parse(reportLoad.data) as BuildReportSet

        this.totalReport.push(...loadedBuildReport)

        return {
            success: true,
            data: JSON.parse(reportLoad.data) as BuildReportSet,
        }
    }
}
