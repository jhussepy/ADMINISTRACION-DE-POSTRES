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
  Play,
  Pause,
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
type Account = {
  name: string;
  email: string;
  profile: Profile | null;
  isAdmin: boolean;
} | null;
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
}: {
  products: Product[];
  account: Account;
  view?: "home" | "catalog" | "product";
  product?: Product;
  initialCategory?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState(false);
  const [category, setCategory] = useState(initialCategory),
    [query, setQuery] = useState(initialQuery),
    [menu, setMenu] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [notice, setNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [heroMotionPaused, setHeroMotionPaused] = useState(false);
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
      normalize(`${p.name} ${p.description}`).includes(normalize(query.trim())),
  );
  const displayed = view === "home" ? products.slice(0, 3) : visible;
  const availableCategories = categories.filter((c) =>
    products.some((p) => p.category === c),
  );
  function updateCatalogUrl(
    nextCategory: string,
    nextQuery: string,
    historyMode: "push" | "replace",
  ) {
    const url = new URL(window.location.href);
    if (nextCategory === "Todos") url.searchParams.delete("categoria");
    else url.searchParams.set("categoria", nextCategory);
    if (nextQuery.trim()) url.searchParams.set("buscar", nextQuery);
    else url.searchParams.delete("buscar");
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
    if (view === "catalog") updateCatalogUrl(value, query, "push");
    scrollToCatalog();
  };
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
    <>
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
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <nav
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
      <main>
        {view === "home" && (
          <>
            <section
              className={`hero photo-hero ${featured ? "" : "hero-without-product"}`}
              aria-labelledby="hero-title"
            >
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="little-line" /> REPOSTERÍA YEMAPE · HECHA CON
                  CARIÑO
                </span>
                <h1 id="hero-title">
                  La vida sabe
                  <br />
                  mejor con <em>postre.</em>
                </h1>
                <p>
                  Tortas, kekes y pequeños antojos para compartir. Elige tu
                  favorito y coordinamos cada detalle por WhatsApp.
                </p>
                <Link href="/catalogo" className="button">
                  Ver catálogo <ArrowRight size={18} />
                </Link>
                <div className="hero-note">
                  <Heart size={17} />
                  <span>Elige a tu ritmo. Coordinamos por WhatsApp.</span>
                </div>
              </div>
              {featured && (
                <div
                  className={`hero-visual ${featured.id === "torta-chocolate" ? "hero-dessert-scene" : ""} ${heroMotionPaused ? "is-motion-paused" : ""}`}
                >
                  {featured.id === "torta-chocolate" ? (
                    <>
                      <div className="hero-dessert-halo" aria-hidden="true" />
                      <div className="hero-dessert-shadow" aria-hidden="true" />
                      <div className="hero-dessert-frame">
                        <Image
                          src="/images/torta-chocolate-hero.webp"
                          alt={featured.name}
                          fill
                          preload
                          sizes="(max-width: 620px) 90vw, (max-width: 1440px) 52vw, 700px"
                          className="hero-image hero-dessert-image"
                        />
                      </div>
                      <button
                        className="hero-motion-toggle"
                        type="button"
                        onClick={() => setHeroMotionPaused((paused) => !paused)}
                        aria-label={
                          heroMotionPaused
                            ? "Reanudar animación del postre"
                            : "Pausar animación del postre"
                        }
                        aria-pressed={heroMotionPaused}
                      >
                        {heroMotionPaused ? (
                          <Play size={15} />
                        ) : (
                          <Pause size={15} />
                        )}
                        <span>{heroMotionPaused ? "Reanudar" : "Pausar"}</span>
                      </button>
                    </>
                  ) : (
                    <Image
                      src={featured.image}
                      alt={featured.name}
                      fill
                      preload
                      sizes="(max-width: 620px) 100vw, (max-width: 1440px) 55vw, 790px"
                      className="hero-image"
                    />
                  )}
                  <div className="hero-caption">
                    <span>UN MOMENTO PARA DISFRUTAR</span>
                    <strong>{featured.name}</strong>
                    <button
                      type="button"
                      onClick={(e) => {
                        detailTrigger.current = e.currentTarget;
                        setSelectedProduct(featured);
                      }}
                      aria-label={`Descubrir ${featured.name}`}
                    >
                      <ArrowRight />
                    </button>
                  </div>
                </div>
              )}
            </section>
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
                ? "discovery-layout section-wrap"
                : "catalog-layout"
            }
          >
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
                  return view === "home" ? (
                    <Link
                      className="category"
                      key={c}
                      href={
                        c === "Todos"
                          ? "/catalogo"
                          : `/catalogo?categoria=${encodeURIComponent(c)}`
                      }
                    >
                      <span className="category-icon">
                        <Icon size={27} strokeWidth={1.4} />
                      </span>
                      <span>{c === "Todos" ? "Toda la carta" : c}</span>
                    </Link>
                  ) : (
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
              {view === "catalog" && (category !== "Todos" || query) && (
                <div className="active-filters">
                  <span>
                    {category !== "Todos" ? category : "Toda la carta"}
                    {query ? ` · “${query}”` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory("Todos");
                      setQuery("");
                      updateCatalogUrl("Todos", "", "push");
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
              {displayed.length ? (
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
                          <span className="product-label">{p.category}</span>
                          <span className="product-discover">
                            Ver detalles <ArrowRight size={15} />
                          </span>
                        </button>
                        <div className="product-info">
                          <span className="product-presentation">
                            {first.label}
                          </span>
                          <h3>
                            <Link
                              className="product-title-button"
                              href={`/postres/${p.id}`}
                            >
                              {p.name}
                            </Link>
                          </h3>
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
                    {query
                      ? "No encontramos ese antojo"
                      : "Estamos preparando esta categoría"}
                  </h3>
                  <p>
                    {query
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
            <section
              id="hecho-con-carino"
              className="brand-section section-wrap"
            >
              <div className="brand-art">
                <Image
                  src="/images/emblema.webp"
                  alt="Emblema de Repostería Artesanal Yemape"
                  width={300}
                  height={300}
                />
              </div>
              <div className="brand-story">
                <span className="eyebrow">EL TOQUE YEMAPE</span>
                <h2>
                  No solo hacemos postres.
                  <br />
                  <em>Acompañamos tus momentos.</em>
                </h2>
                <p>
                  Ese cumpleaños que esperabas, una tarde en familia o un
                  detalle para alguien especial. Nos encanta ser parte de lo que
                  celebras.
                </p>
                {customCakeAvailable && (
                  <Link
                    className="text-link"
                    href="/postres/torta-personalizada"
                  >
                    Diseñemos tu torta <ArrowRight size={18} />
                  </Link>
                )}
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
      {summary.count > 0 && (
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
    </>
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
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState<CheckoutDetails>({
    name: account?.profile?.full_name ?? "",
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
      setToday(limaToday());
      setStep("cart");
      setError("");
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
  const update = <K extends keyof CheckoutDetails>(
    key: K,
    value: CheckoutDetails[K],
  ) => setDetails((d) => ({ ...d, [key]: value }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkoutError(details, limaToday(), hasCustomCake);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await prepareCheckout(cart, details);
        if (result.error || !result.url) {
          setError(result.error ?? "No pudimos abrir WhatsApp.");
          return;
        }
        window.location.assign(result.url);
      } catch {
        setError(
          "No pudimos conectar. Tu carrito sigue guardado; vuelve a intentarlo.",
        );
      }
    });
  }
  return (
    <dialog
      ref={ref}
      className="cart-dialog"
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
              <span className={step === "cart" ? "active" : ""}>
                01 · Tu selección
              </span>
              <span className={step === "details" ? "active" : ""}>
                02 · Coordinar pedido
              </span>
            </div>
            {step === "cart" ? (
              <>
                <div className="cart-items">
                  {lines.map((l) => (
                    <article className="cart-item" key={`${l.id}:${l.variant}`}>
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
                                chooseVariant(l.id, l.variant!, e.target.value)
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
                {unpriced && (
                  <p className="helper">
                    Tu selección incluye productos por cotizar. Confirmaremos el
                    importe final por WhatsApp.
                  </p>
                )}
                {examples && (
                  <p className="demo-disclaimer">
                    Importes de ejemplo para probar el carrito. El precio final
                    se cotiza por WhatsApp; no se cobra en la web.
                  </p>
                )}
                <p className="helper">
                  Delivery y disponibilidad se confirman al coordinar.
                </p>
                <button
                  className="button full"
                  onClick={() => setStep("details")}
                >
                  Continuar {account ? "" : "como invitado"}{" "}
                  <ArrowRight size={18} />
                </button>
                {!account && (
                  <p className="account-prompt">
                    ¿Ya tienes cuenta? <Link href="/cuenta">Inicia sesión</Link>
                    . Tu carrito se conserva.
                  </p>
                )}
                <button className="text-button" onClick={close}>
                  Seguir eligiendo
                </button>
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
                <fieldset>
                  <legend>¿Cómo prefieres recibirlo?</legend>
                  <div className="delivery-options">
                    <label
                      className={details.delivery === "recojo" ? "chosen" : ""}
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
                  {DEMO_MODE && (
                    <p className="helper">
                      {details.delivery === "delivery"
                        ? `${exampleDelivery.coverage}. ${exampleDelivery.cost}`
                        : exampleDelivery.pickup}
                    </p>
                  )}
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
                      Estos datos nos ayudan a preparar tu cotización. Si tienes
                      una foto de referencia, envíanosla por WhatsApp después.
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
                  <p>
                    {details.delivery === "delivery"
                      ? "Costo de delivery pendiente de confirmar."
                      : "Punto y horario de recojo por coordinar."}
                  </p>
                </section>
                <div className="order-notice">
                  <MessageCircle size={20} />
                  <p>
                    Se abrirá WhatsApp con tu pedido listo para enviar.
                    Confirmaremos disponibilidad, precio final y forma de pago
                    contigo.
                  </p>
                </div>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
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
              </form>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
