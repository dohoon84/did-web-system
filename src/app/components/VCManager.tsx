'use client';

import { useState, useEffect } from 'react';
import { Button, Box, TextField, Typography, Card, CardContent, Select, MenuItem, FormControl, InputLabel, Grid, Paper, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert, FormHelperText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VerifiedIcon from '@mui/icons-material/Verified';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { VerifiableCredential } from '@/lib/db/vcRepository';
import { VCBlockchainTransaction } from '@/lib/db/vcRepository';
import { SelectChangeEvent } from '@mui/material/Select';

interface VCWithTransactions extends VerifiableCredential {
  transactions?: VCBlockchainTransaction[];
}

// DID 목록 인터페이스
interface DID {
  id: string;
  did: string;
  status: string;
}

export default function VCManager() {
  // 상태 변수들
  const [vcs, setVcs] = useState<VCWithTransactions[]>([]);
  const [dids, setDids] = useState<DID[]>([]);
  const [selectedVCId, setSelectedVCId] = useState<string | null>(null);
  const [selectedVC, setSelectedVC] = useState<VCWithTransactions | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState<boolean>(false);
  
  // 새 VC 발급을 위한 상태
  const [issuerDid, setIssuerDid] = useState<string>('');
  const [subjectDid, setSubjectDid] = useState<string>('');
  const [credentialType, setCredentialType] = useState<string>('IdentityCredential');
  const [claims, setClaims] = useState<string>('{\n  "name": "홍길동",\n  "age": 30\n}');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [issuingVC, setIssuingVC] = useState<boolean>(false);
  
  // 페이지 로드 시 VC 및 DID 목록 불러오기
  useEffect(() => {
    fetchVCs();
    fetchDIDs();
  }, []);
  
  // VC 목록 조회
  const fetchVCs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vc?transactions=true');
      const data = await response.json();
      
      if (data.success) {
        setVcs(data.vcs || []);
      } else {
        setError(data.message || 'VC 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('VC 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('VC 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // DID 목록 조회
  const fetchDIDs = async () => {
    try {
      const response = await fetch('/api/did');
      const data = await response.json();
      
      if (data.success) {
        setDids(data.dids || []);
      }
    } catch (err) {
      console.error('DID 조회 오류:', err);
    }
  };
  
  // VC 선택 처리
  const handleVCSelect = (vcId: string) => {
    const selected = vcs.find(vc => vc.id === vcId);
    setSelectedVCId(vcId);
    setSelectedVC(selected || null);
  };
  
  // VC 발급 처리
  const handleIssueVC = async () => {
    setIssuingVC(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // claims JSON 문자열 파싱
      let parsedClaims;
      try {
        parsedClaims = JSON.parse(claims);
      } catch (err) {
        setError('Claims 필드가 유효한 JSON 형식이 아닙니다.');
        setIssuingVC(false);
        return;
      }
      
      // API 호출
      const response = await fetch('/api/vc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerDid,
          subjectDid,
          credentialType,
          claims: parsedClaims,
          expirationDate: expirationDate || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('VC가 성공적으로 발급되었습니다.');
        // 폼 초기화
        setClaims('{\n  "name": "홍길동",\n  "age": 30\n}');
        // VC 목록 새로고침
        fetchVCs();
      } else {
        setError(data.message || 'VC 발급 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('VC 발급 중 오류가 발생했습니다.');
      console.error('VC 발급 오류:', err);
    } finally {
      setIssuingVC(false);
    }
  };
  
  // VC 폐기 처리
  const handleRevokeVC = async (vcId: string) => {
    if (!window.confirm('정말로 이 VC를 폐기하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/vc', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: vcId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('VC가 성공적으로 폐기되었습니다.');
        // VC 목록 새로고침
        fetchVCs();
      } else {
        setError(data.message || 'VC 폐기 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('VC 폐기 중 오류가 발생했습니다.');
      console.error('VC 폐기 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // VC 검증 처리
  const handleVerifyVC = async (vcId: string) => {
    setLoading(true);
    setError(null);
    setVerificationResult(null);
    
    try {
      const response = await fetch('/api/vc/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vcId,
        }),
      });
      
      const data = await response.json();
      setVerificationResult(data);
      setShowVerificationDialog(true);
    } catch (err) {
      setError('VC 검증 중 오류가 발생했습니다.');
      console.error('VC 검증 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // VC 데이터를 보기 좋게 포맷팅
  const formatVCData = (vc: VCWithTransactions | null) => {
    if (!vc) return null;
    
    try {
      const vcData = JSON.parse(vc.credential_data);
      return JSON.stringify(vcData, null, 2);
    } catch (err) {
      return vc.credential_data;
    }
  };
  
  // 트랜잭션 다이얼로그 열기
  const handleShowTransactions = (vc: VCWithTransactions) => {
    setSelectedVC(vc);
    setShowTransactionsDialog(true);
  };
  
  // VC 상태에 따른 Chip 색상 설정
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'revoked':
        return 'error';
      case 'suspended':
        return 'warning';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  };
  
  // 데이터그리드 컬럼 정의
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 220 },
    { field: 'credential_type', headerName: '유형', width: 150 },
    { field: 'issuer_did', headerName: '발급자', width: 220 },
    { field: 'subject_did', headerName: '소유자', width: 220 },
    { field: 'issuance_date', headerName: '발급일', width: 180 },
    { 
      field: 'status', 
      headerName: '상태', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value as string} 
          color={getStatusColor(params.value as string) as any}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: '작업',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton 
            color="primary" 
            onClick={() => handleVerifyVC(params.row.id as string)}
            disabled={loading}
            title="검증"
          >
            <VerifiedUserIcon />
          </IconButton>
          {params.row.status === 'active' && (
            <IconButton 
              color="error" 
              onClick={() => handleRevokeVC(params.row.id as string)}
              disabled={loading}
              title="폐기"
            >
              <DeleteIcon />
            </IconButton>
          )}
          <IconButton 
            color="info" 
            onClick={() => handleShowTransactions(params.row as VCWithTransactions)}
            disabled={loading}
            title="트랜잭션 정보"
          >
            <VerifiedIcon />
          </IconButton>
        </Box>
      )
    },
  ];
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Verifiable Credential 관리
      </Typography>
      
      {/* 알림 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      {/* VC 발급 폼 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          새 VC 발급
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="issuer-did-label">발급자 DID</InputLabel>
              <Select
                labelId="issuer-did-label"
                value={issuerDid}
                onChange={(e: SelectChangeEvent) => setIssuerDid(e.target.value)}
                label="발급자 DID"
                disabled={issuingVC}
              >
                {dids.map((did) => (
                  <MenuItem key={did.id} value={did.did}>
                    {did.did}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="subject-did-label">대상자(소유자) DID</InputLabel>
              <Select
                labelId="subject-did-label"
                value={subjectDid}
                onChange={(e: SelectChangeEvent) => setSubjectDid(e.target.value)}
                label="대상자(소유자) DID"
                disabled={issuingVC}
              >
                {dids.map((did) => (
                  <MenuItem key={did.id} value={did.did}>
                    {did.did}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="발급 자격증명 유형"
              value={credentialType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCredentialType(e.target.value)}
              margin="normal"
              disabled={issuingVC}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="만료일 (선택사항)"
              type="date"
              value={expirationDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpirationDate(e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              disabled={issuingVC}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Claims (JSON 형식)"
              multiline
              rows={4}
              value={claims}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClaims(e.target.value)}
              margin="normal"
              disabled={issuingVC}
              error={!!error && error.includes('Claims')}
              helperText={error && error.includes('Claims') ? error : ''}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleIssueVC}
              disabled={issuingVC || !issuerDid || !subjectDid || !credentialType || !claims}
            >
              {issuingVC ? '발급 중...' : 'VC 발급'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* VC 목록 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          VC 목록
        </Typography>
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={vcs}
            columns={columns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 5 } },
            }}
            onRowClick={(params: GridRowParams) => handleVCSelect(params.row.id as string)}
            loading={loading}
          />
        </Box>
      </Paper>
      
      {/* 선택된 VC 상세 정보 */}
      {selectedVC && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            선택된 VC 상세 정보
          </Typography>
          <TextField
            fullWidth
            label="VC 데이터"
            multiline
            rows={10}
            value={formatVCData(selectedVC)}
            InputProps={{ readOnly: true }}
            variant="outlined"
            margin="normal"
          />
        </Paper>
      )}
      
      {/* VC 검증 결과 다이얼로그 */}
      <Dialog
        open={showVerificationDialog}
        onClose={() => setShowVerificationDialog(false)}
        aria-labelledby="verification-dialog-title"
      >
        <DialogTitle id="verification-dialog-title">
          VC 검증 결과
        </DialogTitle>
        <DialogContent>
          {verificationResult && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {verificationResult.valid ? (
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <CancelIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="h6">
                  {verificationResult.valid ? '유효한 VC' : '유효하지 않은 VC'}
                </Typography>
              </Box>
              
              {verificationResult.message && (
                <DialogContentText>
                  {verificationResult.message}
                </DialogContentText>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVerificationDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 트랜잭션 정보 다이얼로그 */}
      <Dialog
        open={showTransactionsDialog}
        onClose={() => setShowTransactionsDialog(false)}
        aria-labelledby="transactions-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="transactions-dialog-title">
          블록체인 트랜잭션 정보
        </DialogTitle>
        <DialogContent>
          {selectedVC && selectedVC.transactions && selectedVC.transactions.length > 0 ? (
            <Box>
              {selectedVC.transactions.map((tx, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1">
                      트랜잭션 유형: {tx.transaction_type}
                    </Typography>
                    <Typography variant="body2">
                      해시: {tx.transaction_hash}
                    </Typography>
                    <Typography variant="body2">
                      상태: <Chip 
                        label={tx.status} 
                        color={tx.status === 'confirmed' ? 'success' : 'error'}
                        size="small"
                      />
                    </Typography>
                    {tx.error_message && (
                      <Typography variant="body2" color="error">
                        오류: {tx.error_message}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      날짜: {new Date(tx.created_at).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <DialogContentText>
              트랜잭션 정보가 없습니다.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransactionsDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 