import { NextRequest, NextResponse } from 'next/server'
import { validateDrawRequest, canApprove, getValidationSummary } from '@/lib/validations'
import { requireAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { drawId: string } }
) {
  try {
    const [, authError] = await requireAuth()
    if (authError) return authError

    const drawId = params.drawId

    if (!drawId) {
      return NextResponse.json(
        { error: 'Missing drawId parameter' },
        { status: 400 }
      )
    }

    // Run full validation
    const validation = await validateDrawRequest(drawId)
    const approvalCheck = await canApprove(drawId)
    const summary = getValidationSummary(validation)

    return NextResponse.json({
      drawId,
      validation,
      canApprove: approvalCheck.canApprove,
      blockers: approvalCheck.blockers,
      summary,
    })

  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

