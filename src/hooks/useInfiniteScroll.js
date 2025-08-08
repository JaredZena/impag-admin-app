import { useEffect, useRef, useCallback } from 'react';
export function useInfiniteScroll({ hasMore, loading, onLoadMore, root = null, rootMargin = '0px', threshold = 1.0, }) {
    const ref = useRef(null);
    const handleObserver = useCallback((entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
            onLoadMore();
        }
    }, [hasMore, loading, onLoadMore]);
    useEffect(() => {
        const option = {
            root,
            rootMargin,
            threshold,
        };
        const observer = new window.IntersectionObserver(handleObserver, option);
        if (ref.current)
            observer.observe(ref.current);
        return () => {
            if (ref.current)
                observer.unobserve(ref.current);
            observer.disconnect();
        };
    }, [handleObserver, root, rootMargin, threshold]);
    return ref;
}
