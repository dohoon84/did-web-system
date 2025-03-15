import { NextRequest, NextResponse } from 'next/server';
import { 
  getIssuerByIdHandler, 
  updateIssuerHandler, 
  deleteIssuerHandler 
} from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return getIssuerByIdHandler(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateIssuerHandler(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return deleteIssuerHandler(request, { params });
} 