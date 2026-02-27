import { ChartBarBig, Search, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/Logo";


function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-9.5 place-items-center rounded-lg border border-border bg-card text-sm font-bold text-foreground">
            <Logo/>
          </div>
          <div className="leading-none">
            <p className="text-sm font-semibold tracking-wide text-foreground">FocusTube</p>
            <p className="text-[11px] text-muted-foreground">A Your Workplace</p>
          </div>
        </Link>

        <div className="ml-auto hidden max-w-md flex-1 md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products, what's in your mind?"
              className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {/* <Button size="icon-sm" variant="ghost" className="md:hidden" aria-label="Menu">
            <Menu className="size-4" />
          </Button> */}
          <Button asChild size="icon-sm" variant="ghost" aria-label="Profile">
            <Link to="/login">
              <UserRound className="size-4" />
            </Link>
            
          </Button>
          {/* <Button asChild size="icon-sm" variant="ghost" aria-label="Wishlist">
            <Link to="/wishlist">
              <Heart className="size-4" />
            </Link>
          </Button> */}
          {/* <Button asChild size="icon-sm" variant="ghost" aria-label="Bag" className="relative">
            <Link to="/bag">
              <ShoppingBag className="size-4" />
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {bagCount}
              </span>
            </Link>
          </Button> */}
        </div>
      </div>

    </header>
  );
}

export default Header;
