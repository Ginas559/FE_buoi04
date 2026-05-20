import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Carousel } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { getProductDetailApi } from '../util/api';
import { logoutUser } from '../redux/slices/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, getCartCount } from '../util/cart';

const formatVnd = (value) => {
    return Number(value || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });
};

const ProductDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const carouselRef = useRef(null);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [related, setRelated] = useState([]);
    const [qty, setQty] = useState(1);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getProductDetailApi(slug);
                if (res?.errCode === 0 && res?.data?.product) {
                    setDetail(res.data.product);
                    setRelated(Array.isArray(res.data.related) ? res.data.related : []);
                } else {
                    setDetail(null);
                    setRelated([]);
                }
            } finally {
                setLoading(false);
                setQty(1);
            }
        };

        load();
    }, [slug]);

    useEffect(() => {
        const syncCartCount = () => setCartCount(getCartCount());
        syncCartCount();

        window.addEventListener('cart:updated', syncCartCount);
        window.addEventListener('storage', syncCartCount);

        return () => {
            window.removeEventListener('cart:updated', syncCartCount);
            window.removeEventListener('storage', syncCartCount);
        };
    }, []);

    const memberName = useMemo(() => {
        const fallback = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        return fallback || user?.email || 'Member';
    }, [user]);

    const onLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const onAddToCart = () => {
        addToCart(detail, totalQty);
        setCartCount(getCartCount());
    };

    if (loading) {
        return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">Đang tải chi tiết sản phẩm...</div>;
    }

    if (!detail) {
        return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">Không tìm thấy sản phẩm.</div>;
    }

    const images = Array.isArray(detail.images) && detail.images.length ? detail.images : [detail.image].filter(Boolean);
    const stockLeft = Number(detail.stock || 0);
    const totalQty = Math.max(1, Math.min(stockLeft || 1, qty));

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
            <header className="border-b border-orange-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="text-xl font-black text-slate-900">SmartZone Store</Link>
                    <div className="ml-auto flex items-center gap-3">
                        <Link to="/cart" className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                            <ShoppingCartOutlined />
                            <span>Giỏ hàng ({cartCount})</span>
                        </Link>
                        {isAuthenticated ? (
                            <>
                                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-slate-700">
                                    {memberName}
                                </div>
                                <button type="button" onClick={onLogout} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                                    Đăng xuất
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Đăng nhập</Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="rounded-[32px] border border-slate-200 bg-white shadow-sm">
                        <div className="relative overflow-hidden rounded-[32px]">
                            {images.length > 1 ? (
                                <Carousel ref={carouselRef} autoplay dots={false} adaptiveHeight className="h-full w-full">
                                    {images.map((src, index) => (
                                        <div key={src + index} className="h-[240px] sm:h-[320px] md:h-[420px] lg:h-[520px] w-full">
                                            <img src={src} alt={`${detail.name}-${index}`} className="h-full w-full object-cover" />
                                        </div>
                                    ))}
                                </Carousel>
                            ) : (
                                <img src={images[0]} alt={detail.name} className="h-[240px] sm:h-[320px] md:h-[420px] lg:h-[520px] w-full object-cover" />
                            )}

                            {/* arrows always visible but disabled when single image */}
                            <button
                                type="button"
                                onClick={() => carouselRef.current?.prev()}
                                disabled={images.length <= 1}
                                className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-lg ${images.length <= 1 ? 'opacity-40 pointer-events-none' : ''}`}>
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={() => carouselRef.current?.next()}
                                disabled={images.length <= 1}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-lg ${images.length <= 1 ? 'opacity-40 pointer-events-none' : ''}`}>
                                ›
                            </button>
                        </div>
                    </section>

                    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm text-left">
                        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">{detail.category}</div>
                        <h1 className="mt-3 text-4xl font-black tracking-tight text-black">{detail.name}</h1>
                        <p className="mt-3 text-base text-slate-500">{detail.brand}</p>
                        <p className="mt-4 text-sm font-semibold text-amber-500">{Number(detail.rating || 0).toFixed(1)} / 5.0</p>

                        <div className="mt-6 flex items-end gap-3">
                            <div className="text-3xl font-black text-orange-600">{formatVnd(detail.price)}</div>
                            <div className="pb-1 text-lg text-slate-400 line-through">{formatVnd(detail.oldPrice)}</div>
                            <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">-{detail.discount || 0}%</span>
                        </div>

                        <p className="mt-5 text-base leading-8 text-slate-600">{detail.description}</p>

                        <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50 p-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between gap-4">
                                <div>Hàng tồn: <span className="font-bold">{stockLeft}</span></div>
                                <div>Đã bán: <span className="font-bold">{Number(detail.sold || 0)}</span></div>
                                <div>Danh mục: <span className="font-bold">{detail.category}</span></div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-sm font-semibold text-slate-600">Số lượng</div>
                            <div className="mt-2 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                                <button type="button" onClick={() => setQty((current) => Math.max(1, current - 1))} className="h-9 w-9 rounded-md bg-slate-100 text-lg">-</button>
                                <input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(event) => {
                                        const next = Number(event.target.value || 1);
                                        if (stockLeft && next > stockLeft) {
                                            setQty(stockLeft);
                                        } else {
                                            setQty(Math.max(1, next));
                                        }
                                    }}
                                    className="w-20 bg-transparent text-center outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setQty((current) => {
                                        const next = current + 1;
                                        if (stockLeft) return Math.min(stockLeft, next);
                                        return next;
                                    })}
                                    className="h-9 w-9 rounded-md bg-slate-100 text-lg"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-700">Thông tin sản phẩm</div>
                            <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                <div>Danh mục tương ứng: <span className="font-semibold">{detail.category}</span></div>
                                <div>Số lượng chọn: <span className="font-semibold">{totalQty}</span></div>
                                <div>Trạng thái: <span className="font-semibold">{stockLeft > 0 ? 'Còn hàng' : 'Hết hàng'}</span></div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={onAddToCart}
                                disabled={stockLeft <= 0}
                                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Thêm vào giỏ hàng
                            </button>
                            <Link to="/cart" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                Xem giỏ hàng
                            </Link>
                        </div>
                    </section>
                </div>

                <section className="mt-10">
                    <div className="mb-5 flex items-end justify-between gap-3">
                        <div>
                            <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">RELATED</div>
                            <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Sản phẩm tương tự</h2>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {related.map((item) => (
                            <Link key={item.slug} to={`/product/${item.slug}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                                <img src={item.image} alt={item.name} className="aspect-[4/5] w-full object-cover" />
                                <div className="p-4 text-left">
                                    <div className="text-xs uppercase tracking-wide text-slate-400">{item.category}</div>
                                    <div className="mt-2 font-bold text-slate-900">{item.name}</div>
                                    <div className="mt-2 text-orange-600">{formatVnd(item.price)}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default ProductDetailPage;