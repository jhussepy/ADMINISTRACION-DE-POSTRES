"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CakeSlice,
  IceCreamBowl,
  ChefHat,
  Cookie,
  Heart,
  Instagram,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  X,
  Sandwich,
  Check,
  MapPin,
  Dessert,
  CalendarDays,
} from "lucide-react";
import {
  CART_KEY,
  MAX_QUANTITY,
  cartSummary,
  checkoutError,
  limaToday,
  money,
  normalizeCart,
  validDate,
} from "@/lib/cart";
import { prepareCheckout } from "@/app/checkout-action";
import type { CartItem, CheckoutDetails, Product, Profile } from "@/lib/types";
import { categories } from "@/lib/types";
import {
  DEMO_MODE,
  exampleDelivery,
  presentation,
  presentations,
} from "@/lib/demo-catalog";
import { ProductDetails } from "./product-details";
import { ProductPage } from "./product-page";
import { StoreFaq } from "./store-faq";
import { WaveGallery } from "./wave-gallery";
import { HomeHero, HomeCategories, DessertSpotlight } from "./home-showcase";
import { useScrollReveal } from "./scroll-reveal";
type Account = {
  name: string;
  email: string;
  profile: Profile | null;
  isAdmin: boolean;
} | null;

type CatalogSort = "recommended" | "price-asc" | "price-desc" | "name";
const FAVORITES_KEY = "yemape-favorites-v1";
const catalogSorts: CatalogSort[] = [
  "recommended",
  "price-asc",
  "price-desc",
  "name",
];
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const categoryIcons = {
  Todos: Heart,
  Cheesecakes: CakeSlice,
  Tortas: ChefHat,
  Kekes: Cookie,
  Pies: Dessert,
  Postres: IceCreamBowl,
  Salados: Sandwich,
};
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Yemape, inicio">
      <span>
        Yemape<span className="brand-dot">♡</span>
      </span>
      <small>REPOSTERÍA ARTESANAL</small>
    </Link>
  );
}
export function Storefront({
  products,
  account,
  view = "home",
  product,
  initialCategory = "Todos",
  initialQuery = "",
  initialSort = "recommended",
}: {
  products: Product[];
  account: Account;
  view?: "home" | "catalog" | "product";
  product?: Product;
  initialCategory?: string;
  initialQuery?: string;
  initialSort?: CatalogSort;
}) {
  const router = useRouter();
  const storefrontRef = useRef<HTMLDivElement>(null);
  useScrollReveal(storefrontRef, view === "home");
  const [cart, setCart] = useState<CartItem[]>([]),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState(false);
  const [category, setCategory] = useState(initialCategory),
    [query, setQuery] = useState(initialQuery),
    [menu, setMenu] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [notice, setNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const sceneMotionPaused = cartOpen || selectedProduct !== null || menu;
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sort, setSort] = useState<CatalogSort>(initialSort);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      setCart(
        normalizeCart(
          JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"),
          products,
        ),
      );
    } catch {
      setCart([]);
    }
    setReady(true);
  }, [products]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        setFavorites(
          saved.filter(
            (id): id is string =>
              typeof id === "string" &&
              products.some((product) => product.id === id),
          ),
        );
      }
    } catch {
      setFavorites([]);
    } finally {
      setFavoritesReady(true);
    }
  }, [products]);
  useEffect(() => {
    if (!favoritesReady) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      setStorageError(true);
    }
  }, [favorites, favoritesReady]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      } catch {
        setStorageError(true);
      }
  }, [cart, ready]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (view !== "catalog") return;
    const restoreFilters = () => {
      const params = new URLSearchParams(window.location.search);
      setCategory(
        categories.find((item) => item === params.get("categoria")) ?? "Todos",
      );
      setQuery((params.get("buscar") ?? "").slice(0, 100));
      const nextSort = params.get("orden");
      setSort(
        catalogSorts.includes(nextSort as CatalogSort)
          ? (nextSort as CatalogSort)
          : "recommended",
      );
    };
    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
  }, [view]);
  const summary = cartSummary(cart, products);
  const featured =
    products.find((p) => p.id === "torta-chocolate") ?? products[0];
  const customCakeAvailable = products.some(
    (p) => p.id === "torta-personalizada",
  );
  const visible = products.filter(
    (p) =>
      (category === "Todos" || p.category === category) &&
      normalize(`${p.name} ${p.description}`).includes(
        normalize(query.trim()),
      ) &&
      (!favoriteOnly || favorites.includes(p.id)),
  );
  const sortedVisible = [...visible].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "es");
    if (sort === "price-asc" || sort === "price-desc") {
      const aPrice = presentations(a)[0].priceCents;
      const bPrice = presentations(b)[0].priceCents;
      if (aPrice === null && bPrice === null) return 0;
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return sort === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
    }
    return 0;
  });
  const displayed = view === "home" ? products.slice(0, 3) : sortedVisible;
  const availableCategories = categories.filter((c) =>
    products.some((p) => p.category === c),
  );
  function updateCatalogUrl(
    nextCategory: string,
    nextQuery: string,
    historyMode: "push" | "replace",
    nextSort: CatalogSort = sort,
  ) {
    const url = new URL(window.location.href);
    if (nextCategory === "Todos") url.searchParams.delete("categoria");
    else url.searchParams.set("categoria", nextCategory);
    if (nextQuery.trim()) url.searchParams.set("buscar", nextQuery);
    else url.searchParams.delete("buscar");
    if (nextSort === "recommended") url.searchParams.delete("orden");
    else url.searchParams.set("orden", nextSort);
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (historyMode === "push") router.push(path, { scroll: false });
    else window.history.replaceState(null, "", path);
  }
  function changeQuery(value: string) {
    setQuery(value);
    if (view === "catalog") updateCatalogUrl(category, value, "replace");
  }
  function scrollToCatalog() {
    if (view !== "catalog") {
      router.push(
        `/catalogo${query.trim() ? `?buscar=${encodeURIComponent(query.trim())}` : ""}`,
      );
      return;
    }
    document.getElementById("catalogo")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  const choose = (value: string) => {
    setCategory(value);
    if (view === "catalog") updateCatalogUrl(value, query, "push", sort);
    scrollToCatalog();
  };
  function changeSort(value: CatalogSort) {
    setSort(value);
    if (view === "catalog") updateCatalogUrl(category, query, "push", value);
  }
  function toggleFavorite(product: Product) {
    const saved = favorites.includes(product.id);
    setFavorites((current) =>
      saved
        ? current.filter((id) => id !== product.id)
        : [...current, product.id],
    );
    setNotice(
      saved
        ? `${product.name} eliminado de favoritos`
        : `${product.name} guardado en favoritos`,
    );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3000);
  }
  function quantity(id: string, amount: number, variant: string) {
    setCart((prev) => {
      const current =
        prev.find((p) => p.id === id && p.variant === variant)?.quantity ?? 0;
      const total = prev
        .filter((p) => p.id === id)
        .reduce((sum, p) => sum + p.quantity, 0);
      const next = current + amount;
      if (next < 1)
        return prev.filter((p) => p.id !== id || p.variant !== variant);
      if (total + amount > MAX_QUANTITY) return prev;
      return current
        ? prev.map((p) =>
            p.id === id && p.variant === variant ? { ...p, quantity: next } : p,
          )
        : [...prev, { id, variant, quantity: next }];
    });
  }
  function add(
    product: Product,
    amount = 1,
    variant = presentations(product)[0].id,
  ) {
    quantity(product.id, amount, variant);
    setNotice(`${amount} × ${product.name} agregado a tu carrito`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3000);
  }
  return (
    <div className="yemape-public" data-store-view={view} ref={storefrontRef}>
      <a
        className="skip-link"
        href={
          view === "home"
            ? "#destacados"
            : view === "product"
              ? "#ficha-postre"
              : "#catalogo"
        }
      >
        Ir al contenido
      </a>
      <div className="announcement">
        {DEMO_MODE
          ? "CATÁLOGO DE MUESTRA · precios, porciones y condiciones por confirmar"
          : "Hecho para compartir, preparado con cariño"}{" "}
        <Heart size={13} aria-hidden="true" />
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              scrollToCatalog();
            }}
          >
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="Buscar postres"
              placeholder="¿Qué se te antoja hoy?"
              value={query}
              maxLength={100}
              onChange={(e) => changeQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") changeQuery("");
              }}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Limpiar búsqueda"
                onClick={() => changeQuery("")}
              >
                <X size={17} />
              </button>
            )}
          </form>
          <div className="header-actions">
            <Link
              className="account-link"
              href="/cuenta"
              aria-label={account ? "Mi cuenta" : "Iniciar sesión"}
            >
              <UserRound size={21} />
              <span>
                <small>
                  {account ? "Qué gusto verte" : "Bienvenido a Yemape"}
                </small>
                {account
                  ? account.name.split(" ")[0] || "Mi cuenta"
                  : "Iniciar sesión"}
              </span>
            </Link>
            <button
              className="cart-trigger"
              onClick={() => setCartOpen(true)}
              aria-label={`Abrir carrito, ${summary.count} productos`}
            >
              <ShoppingBag size={20} />
              <span className="cart-word">Mi carrito</span>
              <b>{summary.count}</b>
            </button>
            <button
              className="icon-button mobile-menu"
              aria-expanded={menu}
              aria-label="Abrir menú"
              aria-controls="store-navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <nav
          id="store-navigation"
          className={`main-nav ${menu ? "is-open" : ""}`}
          aria-label="Navegación principal"
        >
          <Link
            href="/catalogo"
            onClick={() => setMenu(false)}
            aria-current={view === "catalog" ? "page" : undefined}
          >
            Nuestra carta
          </Link>
          {customCakeAvailable && (
            <Link
              href="/postres/torta-personalizada"
              onClick={() => setMenu(false)}
            >
              Tortas a pedido
            </Link>
          )}
          <Link href="/#hecho-con-carino" onClick={() => setMenu(false)}>
            El toque Yemape
          </Link>
          <Link href="/#como-pedir" onClick={() => setMenu(false)}>
            Cómo pedir
          </Link>
          <a href="https://wa.me/51934219749" target="_blank" rel="noreferrer">
            Hablemos por WhatsApp <ArrowRight size={14} />
          </a>
          {account?.isAdmin && <Link href="/admin">Administración</Link>}
        </nav>
      </header>
      <main className={view === "home" ? "yemape-home" : "yemape-store"}>
        {view === "home" && (
          <>
            <HomeHero
              featured={featured}
              paused={sceneMotionPaused}
              onSelect={(selected, trigger) => {
                detailTrigger.current = trigger;
                setSelectedProduct(selected);
              }}
            />
            <div
              className="shopping-benefits"
              aria-label="Cómo comprar en Yemape"
            >
              <span>
                <ShoppingBag size={18} aria-hidden="true" /> Pide sin crear una
                cuenta
              </span>
              <span>
                <MessageCircle size={18} aria-hidden="true" /> Atención por
                WhatsApp
              </span>
              <span>
                <Truck size={18} aria-hidden="true" /> Delivery y recojo por
                coordinar
              </span>
            </div>
          </>
        )}
        {view === "catalog" && (
          <div className="catalog-intro section-wrap">
            <span className="eyebrow">NUESTRA CARTA</span>
            <h1>Elige tu próximo antojo.</h1>
            <p>
              Explora la carta, arma tu carrito y coordinamos tu pedido por
              WhatsApp.
            </p>
            {DEMO_MODE && (
              <p className="demo-disclaimer">
                Los tamaños, precios y condiciones mostrados son ejemplos. La
                cotización real llegará por WhatsApp.
              </p>
            )}
          </div>
        )}
        {view === "product" && product && (
          <ProductPage
            key={product.id}
            product={product}
            products={products}
            cartCount={summary.count}
            inCart={cart
              .filter((item) => item.id === product.id)
              .reduce((n, item) => n + item.quantity, 0)}
            ready={ready}
            onAdd={(amount, variant) => add(product, amount, variant)}
            onOrder={(amount, variant) => {
              add(product, amount, variant);
              setCartOpen(true);
            }}
            onViewCart={() => setCartOpen(true)}
          />
        )}
        {view !== "product" && (
          <div
            className={
              view === "home"
                ? "discovery-layout home-discovery section-wrap"
                : "catalog-layout"
            }
          >
            {view === "home" ? (
              <HomeCategories products={products} />
            ) : (
              <section
                className="category-section"
                aria-label="Categorías de postres"
              >
                {view === "catalog" && (
                  <div className="catalog-category-heading">
                    <div>
                      <span className="eyebrow">EXPLORA YEMAPE</span>
                      <h2>Encuentra tu favorito</h2>
                    </div>
                    <span className="category-scroll-hint" aria-hidden="true">
                      Desliza para ver más <ArrowRight size={14} />
                    </span>
                  </div>
                )}
                <div className="category-list">
                  {(["Todos", ...availableCategories] as const).map((c) => {
                    const Icon = categoryIcons[c];
                    return (
                      <button
                        className={`category ${category === c ? "selected" : ""}`}
                        key={c}
                        onClick={() => choose(c)}
                        aria-pressed={category === c}
                      >
                        <span className="category-icon">
                          <Icon size={27} strokeWidth={1.4} />
                        </span>
                        <span>{c === "Todos" ? "Todos los antojos" : c}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            <section
              id={view === "home" ? "destacados" : "catalogo"}
              className={`catalog section-wrap ${view === "home" ? "featured-catalog" : ""}`}
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {view === "home" ? "PARA EMPEZAR" : "TODOS LOS ANTOJOS"}
                  </span>
                  <h2>
                    {view === "home"
                      ? "Los favoritos para compartir."
                      : "¿Qué compartimos hoy?"}
                  </h2>
                  <p>
                    {view === "home"
                      ? "Una pequeña selección de nuestra carta."
                      : "Encuentra ese antojo que hace especial tu día."}
                  </p>
                </div>
                {view === "home" ? (
                  <Link className="text-link" href="/catalogo">
                    Ver toda la carta <ArrowRight size={18} />
                  </Link>
                ) : (
                  <span
                    className="catalog-count"
                    role="status"
                    aria-live="polite"
                  >
                    {visible.length}{" "}
                    {visible.length === 1 ? "opción" : "opciones"} para ti
                  </span>
                )}
              </div>
              {view === "catalog" &&
                (category !== "Todos" ||
                  query ||
                  favoriteOnly ||
                  sort !== "recommended") && (
                  <div className="active-filters">
                    <span>
                      {category !== "Todos" ? category : "Toda la carta"}
                      {query ? ` · “${query}”` : ""}
                      {favoriteOnly ? " · Favoritos" : ""}
                      {sort !== "recommended"
                        ? ` · ${sort === "name" ? "A–Z" : sort === "price-asc" ? "Menor precio" : "Mayor precio"}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory("Todos");
                        setQuery("");
                        setFavoriteOnly(false);
                        setSort("recommended");
                        updateCatalogUrl("Todos", "", "push", "recommended");
                      }}
                    >
                      Limpiar filtros <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              {view === "catalog" && (
                <div className="mobile-search">
                  <Search size={19} />
                  <input
                    aria-label="Buscar en catálogo"
                    placeholder="Busca tu antojo favorito"
                    value={query}
                    maxLength={100}
                    onChange={(e) => changeQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") changeQuery("");
                    }}
                  />
                  {query && (
                    <button
                      type="button"
                      className="search-clear"
                      aria-label="Limpiar búsqueda"
                      onClick={() => changeQuery("")}
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>
              )}
              {view === "catalog" && (
                <div className="catalog-tools">
                  <button
                    type="button"
                    className={`favorites-filter ${favoriteOnly ? "is-active" : ""}`}
                    aria-pressed={favoriteOnly}
                    onClick={() => setFavoriteOnly((value) => !value)}
                    disabled={!favoritesReady}
                  >
                    <Heart
                      size={17}
                      fill={favoriteOnly ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                    Mis favoritos
                    {favoritesReady && favorites.length > 0
                      ? ` (${favorites.length})`
                      : ""}
                  </button>
                  <label className="catalog-sort">
                    <span>Ordenar</span>
                    <select
                      aria-label="Ordenar catálogo"
                      value={sort}
                      onChange={(e) =>
                        changeSort(e.target.value as CatalogSort)
                      }
                    >
                      <option value="recommended">Recomendados</option>
                      <option value="price-asc">Precio: menor a mayor</option>
                      <option value="price-desc">Precio: mayor a menor</option>
                      <option value="name">Nombre: A–Z</option>
                    </select>
                  </label>
                </div>
              )}
              {view === "home" && products.length ? (
                <WaveGallery
                  products={products.slice(0, 6)}
                  onSelect={(selected, trigger) => {
                    detailTrigger.current = trigger;
                    setSelectedProduct(selected);
                  }}
                />
              ) : displayed.length ? (
                <div className="product-grid">
                  {displayed.map((p, i) => {
                    const count = cart
                      .filter((x) => x.id === p.id)
                      .reduce((n, x) => n + x.quantity, 0);
                    const first = presentations(p)[0];
                    return (
                      <article
                        className={`product-card card-${i % 4}`}
                        key={p.id}
                      >
                        <button
                          type="button"
                          className={`favorite-button ${favorites.includes(p.id) ? "is-favorite" : ""}`}
                          aria-label={
                            favorites.includes(p.id)
                              ? `Quitar ${p.name} de favoritos`
                              : `Guardar ${p.name} en favoritos`
                          }
                          aria-pressed={favorites.includes(p.id)}
                          onClick={() => toggleFavorite(p)}
                        >
                          <Heart
                            size={18}
                            fill={
                              favorites.includes(p.id) ? "currentColor" : "none"
                            }
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          className="product-photo product-photo-button"
                          onClick={(e) => {
                            detailTrigger.current = e.currentTarget;
                            setSelectedProduct(p);
                          }}
                          aria-label={`Ver detalles de ${p.name}`}
                        >
                          <Image
                            src={p.image}
                            alt={`Imagen referencial de ${p.name}`}
                            fill
                            sizes="(max-width: 359px) 100vw, (max-width: 1020px) 50vw, 25vw"
                          />
                          <span className="product-discover">
                            Ver detalles <ArrowRight size={15} />
                          </span>
                        </button>
                        <div className="product-info">
                          <span className="product-label">{p.category}</span>
                          <h3>
                            <Link
                              className="product-title-button"
                              href={`/postres/${p.id}`}
                            >
                              {p.name}
                            </Link>
                          </h3>
                          <span className="product-presentation">
                            {first.label}
                          </span>
                          <p>{p.description}</p>
                          <div className="product-buy">
                            <strong>
                              {first.priceCents === null
                                ? "Precio por consultar"
                                : `${first.example ? "Ejemplo desde " : "Desde "}${money(first.priceCents)}`}
                            </strong>
                            <button
                              className={`add-button ${count ? "has-items" : ""}`}
                              disabled={!ready || count >= MAX_QUANTITY}
                              onClick={() => add(p)}
                              aria-label={`Agregar ${p.name} al carrito`}
                            >
                              {count ? <Check size={18} /> : <Plus size={18} />}
                              <span>
                                {count ? `Agregar (${count})` : "Agregar"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <Cookie size={40} />
                  <h3>
                    {favoriteOnly
                      ? "Aún no tienes favoritos aquí"
                      : query
                        ? "No encontramos ese antojo"
                        : "Estamos preparando esta categoría"}
                  </h3>
                  <p>
                    {favoriteOnly
                      ? "Guarda tus postres con el corazón y aparecerán en esta vista."
                      : query
                        ? "Prueba con otro nombre o explora todas las opciones."
                        : "Puedes consultarnos por WhatsApp o descubrir el resto de la carta."}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setCategory("Todos");
                      setQuery("");
                      updateCatalogUrl("Todos", "", "push");
                    }}
                  >
                    Ver toda la carta
                  </button>
                </div>
              )}
              <p className="catalog-footnote">
                Fotografías referenciales.{" "}
                {DEMO_MODE
                  ? "Tamaños e importes de muestra."
                  : "Consulta tamaños y porciones."}{" "}
                Confirmaremos presentación, disponibilidad y precio por
                WhatsApp.
              </p>
              {view === "home" && (
                <Link className="button featured-cta" href="/catalogo">
                  Explorar el catálogo completo <ArrowRight size={18} />
                </Link>
              )}
            </section>
          </div>
        )}
        {view === "home" && featured && (
          <DessertSpotlight
            product={featured}
            onSelect={(selected, trigger) => {
              detailTrigger.current = trigger;
              setSelectedProduct(selected);
            }}
          />
        )}
        {view === "home" && (
          <>
            <section
              className="occasion-section section-wrap"
              aria-labelledby="occasions-title"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ENCUENTRA TU MOMENTO</span>
                  <h2 id="occasions-title">Un postre para cada ocasión.</h2>
                  <p>Explora ideas y después coordina tu pedido a tu manera.</p>
                </div>
              </div>
              <div className="occasion-grid">
                {[
                  {
                    title: "Para celebrar",
                    category: "Tortas",
                    image: "/images/torta-chocolate.webp",
                  },
                  {
                    title: "Para compartir",
                    category: "Pies",
                    image: "/images/pie-manzana.webp",
                  },
                  {
                    title: "Para darte un gusto",
                    category: "Postres",
                    image: "/images/brownie-chocolate.webp",
                  },
                ].map((item) => (
                  <Link
                    key={item.title}
                    href={`/catalogo?categoria=${item.category}`}
                    className="occasion-card"
                    data-reveal
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 85vw, 33vw"
                    />
                    <span>
                      <small>{item.category}</small>
                      <strong>{item.title}</strong>
                      <ArrowRight size={20} aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
            <section id="como-pedir" className="how-section section-wrap">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ASÍ DE FÁCIL</span>
                  <h2>De un antojo a tu mesa.</h2>
                </div>
                <span className="no-account">
                  <UserRound size={17} /> Con cuenta o sin ella
                </span>
              </div>
              <div className="steps">
                <article>
                  <span>01</span>
                  <ShoppingBag />
                  <h3>Llena tu carrito</h3>
                  <p>
                    Elige tus postres y las cantidades que quieres compartir.
                  </p>
                </article>
                <article>
                  <span>02</span>
                  <MapPin />
                  <h3>Cuéntanos los detalles</h3>
                  <p>
                    Indica tu fecha deseada y si prefieres recojo o delivery.
                  </p>
                </article>
                <article>
                  <span>03</span>
                  <MessageCircle />
                  <h3>Lo coordinamos contigo</h3>
                  <p>
                    Envía tu carrito por WhatsApp. Confirmamos disponibilidad,
                    importe y pago.
                  </p>
                </article>
              </div>
            </section>
            <section
              className="delivery-sample section-wrap"
              aria-labelledby="delivery-title"
            >
              <div>
                <span className="eyebrow">COORDINEMOS TU PEDIDO</span>
                <h2 id="delivery-title">Entrega y recojo, paso a paso.</h2>
                <p>
                  {DEMO_MODE
                    ? "Condiciones de muestra para explorar el sitio. Confirmaremos las reales por WhatsApp."
                    : "Confirma cobertura, costo y horario al coordinar tu pedido."}
                </p>
              </div>
              <ul>
                <li>
                  <CalendarDays size={19} aria-hidden="true" />
                  {exampleDelivery.leadTime}
                </li>
                <li>
                  <MapPin size={19} aria-hidden="true" />
                  {exampleDelivery.pickup}
                </li>
                <li>
                  <Truck size={19} aria-hidden="true" />
                  {exampleDelivery.coverage}. {exampleDelivery.cost}
                </li>
              </ul>
            </section>
            <section className="contact-band">
              <div>
                <span className="eyebrow">CADA CELEBRACIÓN ES DIFERENTE</span>
                <h2>¿Tienes algo especial en mente?</h2>
                <p>
                  Hablemos de tu torta, tu reunión o ese detalle que quieres
                  regalar.
                </p>
              </div>
              {customCakeAvailable ? (
                <Link href="/postres/torta-personalizada" className="button">
                  <CakeSlice size={19} /> Diseñar mi torta
                </Link>
              ) : (
                <a
                  href="https://wa.me/51934219749"
                  target="_blank"
                  rel="noreferrer"
                  className="button"
                >
                  <MessageCircle size={19} /> Escríbenos
                </a>
              )}
            </section>
          </>
        )}
        {view === "catalog" && <StoreFaq />}
      </main>
      <footer
        className={`site-footer ${summary.count > 0 ? "has-cart-dock" : ""}`}
      >
        <div className="footer-top">
          <Brand />
          <div>
            <h3>Un antojo, un mensaje</h3>
            <a
              href="https://wa.me/51934219749"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp · 934 219 749
            </a>
            <p>Recojo y delivery previa coordinación.</p>
          </div>
          <div>
            <h3>Sigamos compartiendo</h3>
            <a
              href="https://www.instagram.com/reposteria_yemape/"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={17} /> @reposteria_yemape
            </a>
            <a
              href="https://www.tiktok.com/@reposteriayemape11"
              target="_blank"
              rel="noreferrer"
            >
              TikTok · @reposteriayemape11
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Yemape · Repostería artesanal</span>
          <div>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/cuenta">Mi cuenta</Link>
            <Link href="/admin">Administración</Link>
          </div>
        </div>
      </footer>
      <div
        className={`toast ${notice ? "show" : ""} ${summary.count > 0 ? "above-dock" : ""}`}
        role="status"
      >
        {notice && (
          <>
            <Check size={17} />
            {notice}
            <button onClick={() => setCartOpen(true)}>Ver carrito</button>
          </>
        )}
      </div>
      {storageError && (
        <div className="storage-warning" role="status">
          Tu navegador no permite guardar el carrito. Mantenlo abierto hasta
          finalizar.
        </div>
      )}
      {summary.count > 0 && view !== "product" && (
        <div className="mobile-cart-dock" aria-label="Acceso rápido al carrito">
          <div>
            <strong>
              {summary.count} {summary.count === 1 ? "producto" : "productos"}
            </strong>
            <span>
              {summary.unpriced
                ? "Importe por confirmar"
                : money(summary.subtotal)}
            </span>
          </div>
          <button className="button" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={18} /> Ver mi carrito <ArrowRight size={16} />
          </button>
        </div>
      )}
      {selectedProduct && (
        <ProductDetails
          key={selectedProduct.id}
          product={selectedProduct}
          returnFocusTo={detailTrigger.current}
          inCart={cart
            .filter((item) => item.id === selectedProduct.id)
            .reduce((n, item) => n + item.quantity, 0)}
          onClose={() => setSelectedProduct(null)}
          onAdd={(amount, variant) => {
            add(selectedProduct, amount, variant);
            setSelectedProduct(null);
          }}
        />
      )}
      <CartDialog
        open={cartOpen}
        close={() => setCartOpen(false)}
        cart={cart}
        products={products}
        account={account}
        change={quantity}
        chooseVariant={(id, oldVariant, newVariant) =>
          setCart((prev) => {
            const previous = prev.find(
              (p) => p.id === id && p.variant === oldVariant,
            );
            if (
              !previous ||
              !presentation(
                products.find((p) => p.id === id)!,
                newVariant,
              )
            )
              return prev;
            return normalizeCart(
              [
                ...prev.filter((p) => p.id !== id || p.variant !== oldVariant),
                { id, variant: newVariant, quantity: previous.quantity },
              ],
              products,
            );
          })
        }
        remove={(id, variant) =>
          setCart((prev) =>
            prev.filter((p) => p.id !== id || p.variant !== variant),
          )
        }
      />
    </div>
  );
}
function CartDialog({
  open,
  close,
  cart,
  products,
  account,
  change,
  chooseVariant,
  remove,
}: {
  open: boolean;
  close: () => void;
  cart: CartItem[];
  products: Product[];
  account: Account;
  change: (id: string, q: number, variant: string) => void;
  chooseVariant: (id: string, oldVariant: string, newVariant: string) => void;
  remove: (id: string, variant: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const checkoutKey = useRef("");
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [error, setError] = useState<{ message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState<CheckoutDetails>({
    name: account?.profile?.full_name ?? "",
    phone: account?.profile?.phone ?? "",
    address: account?.profile?.address ?? "",
    date: "",
    delivery: "recojo",
    notes: "",
  });
  const [today, setToday] = useState("");
  const { lines, count, subtotal, unpriced, examples } = cartSummary(
    cart,
    products,
  );
  const hasCustomCake = lines.some((line) => line.id === "torta-personalizada");
  useEffect(() => {
    if (open) {
      ref.current?.showModal();
      checkoutKey.current = crypto.randomUUID();
      setToday(limaToday());
      setStep("cart");
      setError(null);
      document.body.style.overflow = "hidden";
    } else {
      ref.current?.close();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (open) ref.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [step, open]);
  useEffect(() => {
    // Each failed attempt creates a new notice, even when its text is unchanged.
    if (error) errorRef.current?.focus();
  }, [error]);
  const requestedDate = validDate(details.date)
    ? new Intl.DateTimeFormat("es-PE", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Lima",
      }).format(new Date(`${details.date}T12:00:00Z`))
    : "Elige una fecha";
  const update = <K extends keyof CheckoutDetails>(
    key: K,
    value: CheckoutDetails[K],
  ) => setDetails((d) => ({ ...d, [key]: value }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkoutError(details, limaToday(), hasCustomCake);
    if (problem) {
      setError({ message: problem });
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await prepareCheckout(
          cart,
          details,
          checkoutKey.current,
        );
        if (result.error || !result.url) {
          setError({ message: result.error ?? "No pudimos abrir WhatsApp." });
          return;
        }
        window.location.assign(result.url);
      } catch {
        setError({
          message:
            "No pudimos conectar. Tu carrito sigue guardado; vuelve a intentarlo.",
        });
      }
    });
  }
  return (
    <dialog
      ref={ref}
      className={`cart-dialog commerce-dialog${step === "details" && count ? " checkout-dialog" : ""}`}
      aria-labelledby="cart-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="cart-content">
        <div className="cart-heading">
          <div>
            <span className="eyebrow">UN POQUITO DE FELICIDAD</span>
            <h2 id="cart-title">
              {step === "cart" ? "Tu carrito" : "Los detalles de tu pedido"}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Cerrar carrito"
          >
            <X />
          </button>
        </div>
        {!count ? (
          <div className="empty-state">
            <ShoppingBag size={48} />
            <h3>Aquí comienza tu antojo</h3>
            <p>Agrega tus favoritos y coordinamos tu pedido por WhatsApp.</p>
            <button className="button" onClick={close}>
              Explorar la carta <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="cart-progress">
              <span
                className={step === "cart" ? "active" : ""}
                aria-current={step === "cart" ? "step" : undefined}
              >
                01 · Tu selección
              </span>
              <span
                className={step === "details" ? "active" : ""}
                aria-current={step === "details" ? "step" : undefined}
              >
                02 · Coordinar pedido
              </span>
            </div>
            {step === "cart" ? (
              <>
                <div className="cart-selection">
                  <div className="cart-items">
                    {lines.map((l) => (
                      <article
                        className="cart-item"
                        key={`${l.id}:${l.variant}`}
                      >
                        <Image
                          src={l.product.image}
                          alt={l.product.name}
                          width={82}
                          height={92}
                        />
                        <div className="cart-item-info">
                          <h3>{l.product.name}</h3>
                          {presentations(l.product).length > 1 ? (
                            <label className="cart-presentation">
                              Presentación de {l.product.name}
                              <select
                                value={l.variant}
                                onChange={(e) =>
                                  chooseVariant(
                                    l.id,
                                    l.variant!,
                                    e.target.value,
                                  )
                                }
                              >
                                {presentations(l.product).map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <p>{l.offer.label}</p>
                          )}
                          <strong>
                            {l.offer.priceCents === null
                              ? "Por cotizar"
                              : `${money(l.offer.priceCents * l.quantity)}${l.offer.example ? " · ejemplo" : ""}`}
                          </strong>
                          <div className="quantity">
                            <button
                              aria-label={`Quitar una unidad de ${l.product.name}`}
                              onClick={() => change(l.id, -1, l.variant!)}
                            >
                              <Minus size={14} />
                            </button>
                            <span aria-label="Cantidad">{l.quantity}</span>
                            <button
                              aria-label={`Sumar una unidad de ${l.product.name}`}
                              disabled={
                                lines
                                  .filter((line) => line.id === l.id)
                                  .reduce((n, line) => n + line.quantity, 0) >=
                                MAX_QUANTITY
                              }
                              onClick={() => change(l.id, 1, l.variant!)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <button
                          className="remove-button"
                          onClick={() => remove(l.id, l.variant!)}
                          aria-label={`Eliminar ${l.product.name}`}
                        >
                          <X size={17} />
                        </button>
                      </article>
                    ))}
                  </div>
                  {unpriced && (
                    <p className="helper">
                      Tu selección incluye productos por cotizar. Confirmaremos
                      el importe final por WhatsApp.
                    </p>
                  )}
                  {examples && (
                    <p className="demo-disclaimer">
                      Importes de ejemplo para probar el carrito. El precio
                      final se cotiza por WhatsApp; no se cobra en la web.
                    </p>
                  )}
                  <p className="helper">
                    Delivery y disponibilidad se confirman al coordinar.
                  </p>
                </div>
                <div className="cart-summary">
                  <div className="cart-total">
                    <span>
                      {examples
                        ? "Estimado de muestra"
                        : unpriced
                          ? "Productos con precio"
                          : "Subtotal de productos"}
                    </span>
                    <strong>
                      {unpriced && subtotal === 0
                        ? "Por cotizar"
                        : money(subtotal)}
                    </strong>
                  </div>
                  <button
                    className="button full"
                    onClick={() => setStep("details")}
                  >
                    Continuar {account ? "" : "como invitado"}{" "}
                    <ArrowRight size={18} />
                  </button>
                  {!account && (
                    <p className="account-prompt">
                      ¿Ya tienes cuenta?{" "}
                      <Link href="/cuenta">Inicia sesión</Link>. Tu carrito se
                      conserva.
                    </p>
                  )}
                  <button className="text-button" onClick={close}>
                    Seguir eligiendo
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submit} className="checkout-form">
                <button
                  type="button"
                  className="text-button back-button"
                  onClick={() => setStep("cart")}
                >
                  ← Revisar mi carrito ({count})
                </button>
                <div className="checkout-fields">
                  <div className="checkout-section-heading">
                    <h3>Tu contacto</h3>
                    <p>
                      Nombre, teléfono y fecha son obligatorios para coordinar.
                    </p>
                  </div>
                  <div className="checkout-contact">
                    <label>
                      Tu nombre
                      <input
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={100}
                        value={details.name}
                        onChange={(e) => update("name", e.target.value)}
                      />
                    </label>
                    <label>
                      Teléfono para coordinar
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        minLength={7}
                        maxLength={20}
                        placeholder="Ej.: 934 219 749"
                        value={details.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                      <small>
                        Lo usaremos para identificar tu solicitud y coordinar
                        por WhatsApp.
                      </small>
                    </label>
                  </div>
                  <div className="checkout-section-heading">
                    <h3>Entrega y fecha</h3>
                  </div>
                  <fieldset>
                    <legend>¿Cómo prefieres recibirlo?</legend>
                    <div className="delivery-options">
                      <label
                        className={
                          details.delivery === "recojo" ? "chosen" : ""
                        }
                      >
                        <input
                          type="radio"
                          name="delivery"
                          value="recojo"
                          checked={details.delivery === "recojo"}
                          onChange={() => update("delivery", "recojo")}
                        />
                        <ShoppingBag size={18} /> Recojo
                      </label>
                      <label
                        className={
                          details.delivery === "delivery" ? "chosen" : ""
                        }
                      >
                        <input
                          type="radio"
                          name="delivery"
                          value="delivery"
                          checked={details.delivery === "delivery"}
                          onChange={() => update("delivery", "delivery")}
                        />
                        <Truck size={18} /> Delivery
                      </label>
                    </div>
                  </fieldset>
                  {details.delivery === "delivery" ? (
                    <label>
                      Distrito y dirección
                      <input
                        autoComplete="street-address"
                        required
                        minLength={8}
                        maxLength={250}
                        value={details.address}
                        onChange={(e) => update("address", e.target.value)}
                      />
                      <small>
                        Confirmaremos cobertura y costo de envío por WhatsApp.
                      </small>
                    </label>
                  ) : (
                    <p className="helper">
                      <MapPin size={15} /> Coordinaremos contigo el punto y
                      horario de recojo.
                    </p>
                  )}
                  <label>
                    Fecha deseada
                    <input
                      type="date"
                      required
                      min={today}
                      value={details.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                    <small>La fecha está sujeta a disponibilidad.</small>
                  </label>
                  {hasCustomCake && (
                    <fieldset className="cake-request">
                      <legend>Detalles de tu torta personalizada</legend>
                      <p>
                        Estos datos nos ayudan a preparar tu cotización. Si
                        tienes una foto de referencia, envíanosla por WhatsApp
                        después.
                      </p>
                      <label>
                        ¿Para cuántas personas?
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={500}
                          required
                          value={details.cakeGuests ?? ""}
                          onChange={(e) => update("cakeGuests", e.target.value)}
                        />
                      </label>
                      <label>
                        Sabor que te gustaría <small>(opcional)</small>
                        <input
                          maxLength={80}
                          placeholder="Si aún no lo sabes, lo coordinamos"
                          value={details.cakeFlavor ?? ""}
                          onChange={(e) => update("cakeFlavor", e.target.value)}
                        />
                      </label>
                      <label>
                        Temática, colores o idea <small>(opcional)</small>
                        <textarea
                          maxLength={300}
                          rows={3}
                          placeholder="Cuéntanos cómo la imaginas"
                          value={details.cakeDesign ?? ""}
                          onChange={(e) => update("cakeDesign", e.target.value)}
                        />
                      </label>
                    </fieldset>
                  )}
                  <details className="checkout-extra">
                    <summary>Añadir una indicación (opcional)</summary>
                    <label>
                      ¿Algo que debamos saber? <small>(opcional)</small>
                      <textarea
                        maxLength={500}
                        rows={3}
                        placeholder="Alguna indicación para los demás productos…"
                        value={details.notes}
                        onChange={(e) => update("notes", e.target.value)}
                      />
                    </label>
                  </details>
                  <details className="gift-request">
                    <summary>
                      ¿Es para regalo o celebración? Añade una dedicatoria
                    </summary>
                    <label>
                      Ocasión <small>(opcional)</small>
                      <input
                        maxLength={80}
                        placeholder="Por ejemplo, cumpleaños"
                        value={details.occasion ?? ""}
                        onChange={(e) => update("occasion", e.target.value)}
                      />
                    </label>
                    <label>
                      Dedicatoria solicitada <small>(opcional)</small>
                      <textarea
                        maxLength={180}
                        rows={2}
                        placeholder="Mensaje que te gustaría incluir"
                        value={details.giftNote ?? ""}
                        onChange={(e) => update("giftNote", e.target.value)}
                      />
                    </label>
                    <p>
                      Confirmaremos por WhatsApp si podemos incluir la
                      dedicatoria.
                    </p>
                  </details>
                </div>
                <div className="checkout-aside">
                  <section
                    className="checkout-review"
                    aria-labelledby="checkout-review-title"
                  >
                    <div className="checkout-review-heading">
                      <h3 id="checkout-review-title">Revisa tu selección</h3>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setStep("cart")}
                      >
                        Editar
                      </button>
                    </div>
                    <ul>
                      {lines.map((line) => (
                        <li key={`${line.id}:${line.variant}`}>
                          <span>
                            {line.quantity} × {line.product.name}
                            <small>{line.offer.label}</small>
                          </span>
                          <strong>
                            {line.offer.priceCents === null
                              ? "Por cotizar"
                              : `${money(line.offer.priceCents * line.quantity)}${line.offer.example ? " · ejemplo" : ""}`}
                          </strong>
                        </li>
                      ))}
                    </ul>
                    <div className="review-total">
                      <span>
                        {examples
                          ? "Estimado de muestra"
                          : unpriced
                            ? "Importe de productos"
                            : "Subtotal de productos"}
                      </span>
                      <strong>
                        {unpriced
                          ? subtotal > 0
                            ? `${money(subtotal)} + por cotizar`
                            : "Por cotizar"
                          : money(subtotal)}
                      </strong>
                    </div>
                    {examples && (
                      <p className="demo-disclaimer">
                        Estimación ficticia para mostrar el flujo. El importe
                        definitivo se confirma por WhatsApp.
                      </p>
                    )}
                    <dl className="checkout-coordination">
                      <div>
                        <dt>
                          <CalendarDays size={16} aria-hidden="true" /> Fecha
                          solicitada
                        </dt>
                        <dd>{requestedDate}</dd>
                      </div>
                      <div>
                        <dt>
                          <MapPin size={16} aria-hidden="true" /> Entrega
                        </dt>
                        <dd>
                          {details.delivery === "delivery"
                            ? "Delivery"
                            : "Recojo"}
                        </dd>
                      </div>
                      {details.delivery === "delivery" && (
                        <div>
                          <dt>Dirección solicitada</dt>
                          <dd>
                            {details.address.trim() ||
                              "Completa distrito y dirección"}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p>
                      {details.delivery === "delivery"
                        ? "Costo de delivery pendiente de confirmar."
                        : "Punto y horario de recojo por coordinar."}
                    </p>
                  </section>
                  <div className="order-notice">
                    <MessageCircle size={20} />
                    <p>
                      Abriremos WhatsApp con tu solicitud lista para enviar.
                      Confirmaremos disponibilidad, importe y pago contigo antes
                      de aceptar el pedido.
                    </p>
                  </div>
                  {error && (
                    <p
                      ref={errorRef}
                      className="form-error"
                      role="alert"
                      tabIndex={-1}
                    >
                      {error.message}
                    </p>
                  )}
                  <button
                    disabled={pending}
                    className="button whatsapp-button full"
                    type="submit"
                  >
                    <MessageCircle size={19} />
                    {pending
                      ? "Preparando tu pedido…"
                      : "Finalizar pedido por WhatsApp"}
                  </button>
                  <p className="form-privacy">
                    Usaremos estos datos para coordinar tu pedido.{" "}
                    <Link href="/privacidad">Ver privacidad</Link>.
                  </p>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
