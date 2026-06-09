const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { positiveInt, effectivePrice, primaryImage, cartResponse, syncCartPrices } = require('../utils/helpers');

exports.getCart = async (req, res) => {
    try {
        const cart = await syncCartPrices(await Cart.findOne({ customer: req.user._id }));
        res.json({ cart: cartResponse(cart, req.user._id) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addCartItem = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const product = await Product.findById(productId);
        if (!product || product.status !== 'active' || product.stock <= 0) {
            return res.status(404).json({ message: 'Sản phẩm không hợp lệ hoặc đã hết hàng.' });
        }

        const requestedQty = positiveInt(quantity);
        let cart = await Cart.findOne({ customer: req.user._id });
        if (!cart) cart = new Cart({ customer: req.user._id, items: [], subTotal: 0 });

        const price = effectivePrice(product);
        const item = cart.items.find((entry) => String(entry.product) === String(product._id));

        if (item) {
            const nextQty = item.quantity + requestedQty;
            if (nextQty > product.stock) {
                return res.status(400).json({ message: `Chỉ còn ${product.stock} sản phẩm trong kho.` });
            }
            item.quantity = nextQty;
            item.priceAtAdding = price;
            item.itemTotal = item.quantity * item.priceAtAdding;
        } else {
            if (requestedQty > product.stock) {
                return res.status(400).json({ message: `Chỉ còn ${product.stock} sản phẩm trong kho.` });
            }
            cart.items.push({
                product: product._id,
                name: product.name,
                image: primaryImage(product),
                priceAtAdding: price,
                quantity: requestedQty,
                itemTotal: price * requestedQty
            });
        }

        cart.subTotal = cart.items.reduce((sum, entry) => sum + entry.itemTotal, 0);
        await cart.save();

        const savedCart = cartResponse(cart, req.user._id);
        req.app.get('io').to(String(req.user._id)).emit('cart_updated', savedCart.items.length);
        res.status(201).json({ cart: savedCart });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const cart = await Cart.findOne({ customer: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống.' });

        const item = cart.items.find((entry) => String(entry.product) === req.params.productId);
        if (!item) return res.status(404).json({ message: 'Sản phẩm không có trong giỏ.' });

        const product = await Product.findById(req.params.productId);
        if (!product || product.status !== 'active' || product.stock <= 0) {
            return res.status(400).json({ message: 'Sản phẩm không còn khả dụng.' });
        }

        const nextQty = positiveInt(req.body.quantity);
        if (nextQty > product.stock) {
            return res.status(400).json({ message: `Chỉ còn ${product.stock} sản phẩm trong kho.` });
        }

        item.quantity = nextQty;
        item.name = product.name;
        item.image = primaryImage(product);
        item.priceAtAdding = effectivePrice(product);
        item.itemTotal = item.quantity * item.priceAtAdding;

        cart.subTotal = cart.items.reduce((sum, entry) => sum + entry.itemTotal, 0);
        await cart.save();

        const savedCart = cartResponse(cart, req.user._id);
        req.app.get('io').to(String(req.user._id)).emit('cart_updated', savedCart.items.length);

        res.json({ cart: savedCart });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.removeCartItem = async (req, res) => {
    try {
        const cart = await Cart.findOne({ customer: req.user._id });
        if (!cart) return res.json({ cart: cartResponse(null, req.user._id) });

        cart.items = cart.items.filter((entry) => String(entry.product) !== req.params.productId);
        cart.subTotal = cart.items.reduce((sum, entry) => sum + entry.itemTotal, 0);
        await cart.save();

        const savedCart = cartResponse(cart, req.user._id);
        req.app.get('io').to(String(req.user._id)).emit('cart_updated', savedCart.items.length);

        res.json({ cart: savedCart });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
