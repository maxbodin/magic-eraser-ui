import { onBeforeUnmount, onMounted } from "vue";

/**
 * Composable for mouse tracking effect.
 * Creates a custom cursor that follows the mouse.
 * Optimized for performance with requestAnimationFrame.
 */
export const useMouseTracking = () => {
	let mouseX = 0;
	let mouseY = 0;
	let cursorElement: HTMLElement | null = null;
	let animationFrameId: number | null = null;
	let isMouseOver = false;

	const updateCursorPosition = () => {
		if (cursorElement && isMouseOver) {
			cursorElement.style.transform = `translate3d(${ mouseX }px, ${ mouseY }px, 0)`;
			animationFrameId = requestAnimationFrame( updateCursorPosition );
		}
	};

	const handleMouseMove = ( e: MouseEvent ) => {
		mouseX = e.clientX;
		mouseY = e.clientY;

		if (!isMouseOver) {
			isMouseOver = true;
			if (animationFrameId === null) {
				animationFrameId = requestAnimationFrame( updateCursorPosition );
			}
		}
	};

	const handleMouseLeave = () => {
		isMouseOver = false;
		if (animationFrameId !== null) {
			cancelAnimationFrame( animationFrameId );
			animationFrameId = null;
		}
	};

	onMounted( () => {
		cursorElement = document.getElementById( "cursor-follow" );

		// Only enable mouse tracking on devices that support hover
		if (window.matchMedia( "(hover: hover)" ).matches) {
			document.addEventListener( "mousemove", handleMouseMove, { passive: true } );
			document.addEventListener( "mouseleave", handleMouseLeave, { passive: true } );
		}
	} );

	onBeforeUnmount( () => {
		document.removeEventListener( "mousemove", handleMouseMove );
		document.removeEventListener( "mouseleave", handleMouseLeave );

		if (animationFrameId !== null) {
			cancelAnimationFrame( animationFrameId );
		}
	} );

	return { updateCursorPosition };
};

