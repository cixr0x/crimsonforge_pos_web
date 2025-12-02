import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import './App.css';

type Product = {
  product_id: number;
  code: string;
  name: string;
  image: string | null;
  price: number;
  available_qty: number;
};

type PaymentType = 'card' | 'cash';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const IMAGE_BASE = 'https://storage.googleapis.com/crimsonforge-bucket/pos/products';

const buildImageCandidates = (product: Product | null): string[] => {
  if (!product) return [];
  const list: string[] = [];
  if (product.image) {
    list.push(product.image);
  }
  const codeSlug = (product.code || '').trim();
  if (codeSlug) {
    ['jpg', 'jpeg', 'png', 'gif'].forEach((ext) => list.push(`${IMAGE_BASE}/${codeSlug}.${ext}`));
  }
  return Array.from(new Set(list));
};

function ProductCard({
  product,
  onRegisterSale,
  busy,
}: {
  product: Product;
  onRegisterSale: (id: number) => void;
  busy: boolean;
}) {
  const priceLabel = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price ?? 0),
    [product.price]
  );

  const outOfStock = product.available_qty <= 0;
  const imageCandidates = useMemo(() => buildImageCandidates(product), [product]);

  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    setActiveImage(imageCandidates[0] ?? null);
  }, [imageCandidates]);

  const handleImageError = () => {
    setActiveImage((prev) => {
      const currentIdx = prev ? imageCandidates.indexOf(prev) : -1;
      const nextIdx = currentIdx + 1;
      return nextIdx < imageCandidates.length ? imageCandidates[nextIdx] : null;
    });
  };

  return (
    <Card
      className="product-card"
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'row', sm: 'column' },
        alignItems: { xs: 'center', sm: 'stretch' },
        gap: { xs: 2, sm: 0 },
        p: { xs: 1.5, sm: 0 },
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {activeImage ? (
        <CardMedia
          component="img"
          className="product-media"
          image={activeImage}
          title={product.name}
          onError={handleImageError}
          sx={{
            width: { xs: 96, sm: '100%' },
            height: { xs: 96, sm: 'auto' },
            aspectRatio: '1 / 1',
            borderRadius: { xs: 2, sm: '20px 20px 0 0' },
            flexShrink: 0,
            objectFit: 'cover',
            overflow: 'hidden',
          }}
        />
      ) : (
        <Box
          className="product-media"
          sx={{
            width: { xs: 96, sm: '100%' },
            height: { xs: 96, sm: 'auto' },
            aspectRatio: '1 / 1',
            borderRadius: { xs: 2, sm: '20px 20px 0 0' },
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            border: '1px solid rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}
        >
          <Typography variant="h5" color="text.primary">
            {product.code || '#'}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
        <CardContent sx={{ pb: { xs: 1, sm: 2 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            gap={1}
            sx={{ flexWrap: 'wrap', minWidth: 0 }}
          >
            <Typography component="h3" variant="h6" fontWeight={700}>
              {product.name}
            </Typography>
            <Chip size="small" label={`${product.available_qty} in stock`} color={outOfStock ? 'default' : 'success'} />
          </Stack>
          <Typography variant="h5" fontWeight={700} mt={1}>
            {priceLabel}
          </Typography>
        </CardContent>
        <CardActions sx={{ pt: 0, pb: { xs: 1, sm: 2 }, px: { xs: 1, sm: 2 } }}>
          <Button
            variant="contained"
            fullWidth
            disabled={outOfStock || busy}
            onClick={() => onRegisterSale(product.product_id)}
          >
            {busy ? 'Registrando…' : 'Registrar venta'}
          </Button>
        </CardActions>
      </Box>
    </Card>
  );
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [confirmImageIdx, setConfirmImageIdx] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');

  const resetConfirmation = () => {
    setConfirmProduct(null);
    setConfirmImageIdx(0);
    setPaymentType('cash');
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/products`);
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const data = (await response.json()) as Product[];
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load products right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleRegisterSale = (productId: number) => {
    const product = products.find((p) => p.product_id === productId);
    if (!product) return;
    setConfirmProduct(product);
    setConfirmImageIdx(0);
    setPaymentType('cash');
  };

  const confirmRegisterSale = async () => {
    if (!confirmProduct) return;
    const productId = confirmProduct.product_id;
    const selectedPaymentType = paymentType;
    resetConfirmation();
    try {
      setPostingId(productId);
      setError(null);
      const response = await fetch(`${API_BASE}/api/products/${productId}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentType: selectedPaymentType }),
      });
      if (!response.ok) {
        const { message } = await response.json().catch(() => ({ message: 'Fallo el registro de la venta' }));
        throw new Error(message);
      }
      setSnackbar({ open: true, message: 'Venta registrada', severity: 'success' });
      await loadProducts();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'No se pudo registrar la venta.',
        severity: 'error',
      });
    } finally {
      setPostingId(null);
    }
  };

  return (
    <Box className="page">
      <AppBar position="sticky" elevation={0} color="transparent" className="frosted">
        <Toolbar>
          <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: 0.4, flexGrow: 1 }}>
            Crimson Forge
          </Typography>
          <Chip label="Live" color="success" size="small" variant="outlined" />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack spacing={2} sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="h3" fontWeight={800}>
            Productos
          </Typography>
        </Stack>

        {loading ? (
          <Stack alignItems="center" py={8}>
            <CircularProgress color="inherit" />
          </Stack>
        ) : error ? (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
              },
            }}
          >
            {products.map((product) => (
              <Box key={product.product_id}>
                <ProductCard
                  product={product}
                  onRegisterSale={handleRegisterSale}
                  busy={postingId === product.product_id}
                />
              </Box>
            ))}
          </Box>
        )}
      </Container>

      <Dialog open={Boolean(confirmProduct)} onClose={resetConfirmation}>
        <DialogTitle>Registrar venta</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Registrar venta de "{confirmProduct?.name}"?
          </DialogContentText>
          {confirmProduct && (
            <Stack direction="row" gap={2} alignItems="center" mt={2}>
              {(() => {
                const candidates = buildImageCandidates(confirmProduct);
                const active = candidates[confirmImageIdx];
                const fallbackNext =
                  confirmImageIdx + 1 < candidates.length ? () => setConfirmImageIdx(confirmImageIdx + 1) : undefined;
                return active ? (
                  <Box
                    component="img"
                    src={active}
                    alt={confirmProduct.name}
                    onError={fallbackNext}
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 2,
                      objectFit: 'cover',
                      border: '1px solid rgba(15,23,42,0.1)',
                      backgroundColor: '#f1f5f9',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 2,
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#0f172a',
                      border: '1px solid rgba(15,23,42,0.1)',
                    }}
                  >
                    {confirmProduct.code}
                  </Box>
                );
              })()}
              <Stack flex={1} spacing={0.5}>
                <Typography variant="body1" fontWeight={700}>
                  {confirmProduct.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stock: {confirmProduct.available_qty}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                    confirmProduct.price ?? 0
                  )}
                </Typography>
              </Stack>
            </Stack>
          )}
          <FormControl component="fieldset" sx={{ mt: 3 }}>
            <FormLabel component="legend">Forma de pago</FormLabel>
            <RadioGroup
              row
              name="payment-type"
              value={paymentType}
              onChange={(event) => setPaymentType(event.target.value as PaymentType)}
            >
              <FormControlLabel value="cash" control={<Radio />} label="Efectivo" />
              <FormControlLabel value="card" control={<Radio />} label="Tarjeta" />
              
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetConfirmation} disabled={postingId !== null}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmRegisterSale} disabled={postingId !== null}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
